## The personal tier, phase 1 — the folder, the manifest, the pipeline, and Doctor Doom through it (2026-09-28)

Worked in the worktree `/home/justin-a/code/mtg-table-t2x` on branch
`personal-tier`, from `main` at `a08c15f`. Decisions **D190** (the tier and its
two-tier rule), **D191** (the pipeline's rules) and **D192** (fix pass 1: how
`check.mjs` judges a rig map, and the preview browser's isolation), in the
lane's reserved range D190–D199; PLAN.md *The personal tier* has the status and
phase 2; `docs/guides/personal-tier.md` is the manual.

Run on the user's desktop (16 threads, Node 24.20, three 0.186.0,
@gltf-transform 4.5.0 with its nested meshoptimizer 1.2.0, the snap Chromium)
beside another lane's gate. **Nothing in this document is a picture of the
model**, and no file under `personal/` is committed: the numbers below are what
the tools printed, and the previews stay in `personal/models/doctor-doom/preview/`
on this machine. Logs are under the worktree's gitignored `var/personal-tier/`.

The one input was the user's own download, `doctor_doom.zip` (3,429,964 bytes,
sha256 `92ea148e…42741791`), Sketchfab's autoconverted glTF of the survey's pick,
read from the main checkout's `var/personal/models/doctor-doom/` and copied —
never moved or modified (the two sha256 sums were compared).

```bash
node tools/personal/import.mjs /home/justin-a/code/mtg-table/var/personal/models/doctor-doom/doctor_doom.zip doctor-doom
node tools/personal/prepare.mjs doctor-doom --budget 6000 --pose t --card "Doctor Doom" --seat opp
node tools/personal/check.mjs doctor-doom
```

Import took 0.16 s, prepare 0.55 s, and check, with the Chromium previews, 2.9 s
(0.79 s and 3.8 s beside the gate).

---

### 1. What the download is (`import.mjs`)

| | |
|---|---|
| files | `scene.gltf`, `scene.bin`, six PNGs, `license.txt` (9 files, every member CRC-checked) |
| generator | `Sketchfab-15.25.0`, glTF 2.0; `asset.extras`: title *Doctor Doom*, author **RadioactiveAG**, licence CC-BY-4.0, the model URL |
| nodes | 470: 339 joints, 67 mesh nodes |
| triangles | **17,473 = 14,614 to render + 2,859 in rig control shapes** |
| control shapes | 59 mesh nodes under 55 Auto-Rig Pro `cs_*` objects in `cs_grp`, on 7 `cs_*` / `material_0` materials drawn at alpha 0 |
| render meshes | 7 skinned — HOOD 1,049, TUNIC 2,180, `old_steel_01.001` 7,664, CLOAK_PINS 280, CLOAK_ROPE 45, `old_steel_01` 2,718, BELT_BUCKLE_METAL 114 — and the **CLOAK, unskinned**, 564 triangles, under `CLOAK_137`, which is not a joint: it follows nothing |
| materials | 15 (8 on render meshes), `KHR_materials_specular` on six |
| textures | 6 PNGs, all 1024 × 1024: HOOD base colour and normal, TUNIC base colour and normal (shared by the tunic and every steel, pin, rope and buckle material), and the cloak's `HOOD.001` base colour — **a byte-identical copy** of HOOD's (673,444 B each) — with a 222-byte 1-bit flat normal |
| skin | one, 339 joints; **68 carry weight**, 271 are controllers, IK targets, poles and `_ref` bones |
| bind vs rest | `jointWorld × IBM` over the weighted joints spreads 3.1 × 10⁻⁵: the rest pose IS the bind pose. One controller, `c_toes_track.l`, sits 2 units off its bind — unweighted, and the reason the spread is taken over weighted joints only |
| rest pose | **A — the upper arm 60.0° below the horizontal on both sides**, from the inverse bind matrices (shoulder `arm_twist.l` at (0.621, 3.720), elbow `forearm_stretch.l` at (0.946, 3.156)). The survey's "about 45°" was read by eye in the viewer |
| bounds | 2.96 × 4.64 × 1.07 source units — **4.64 units tall**, neither metres nor centimetres. With the control shapes it is 11.8 × 6.1 × 1.8: a normalisation over every mesh would have shrunk Doom to 40% |
| animations | none |
| game-asset names | none of the known patterns |

`SOURCE.txt` was drafted from `asset.extras` and `license.txt`. **The file names
its author RadioactiveAG**; the survey read the page as *AGW Entertainment*
(`@AGWEntertainment`). The draft carries the file's words and says to check them
against the page.

### 2. The rig map — automatic, 22 of 22, no `bones.json`

The scores were Auto-Rig Pro 22, Unreal 6 (ARP's `thigh.l/r`, `hand.l/r` and
`foot.l/r` also spell Unreal names — the first an unweighted mechanism bone), the
rest 0.

| our joint | the joint (its head) | merged into it |
|---|---|---|
| pelvis | `root.x` — but PLACED between the two thigh pivots (y 2.435), because `root.x` sits at the waist (y 2.780) and our clips' hip is at the thighs | — |
| spine_01, spine_02, spine_03 | `spine_01.x`, `spine_02.x`, `spine_03.x` | — |
| neck_01, Head | `neck.x`, `head.x` | `neck_twist.x` |
| clavicle_l/r | `shoulder.l/r` | — |
| upperarm_l/r | **`arm_twist.l/r`** | `arm_stretch`, `c_arm_twist_offset` (the weighted one), `arm_twist_twk` |
| lowerarm_l/r | `forearm_stretch.l/r` | `forearm_twist` |
| hand_l/r | `hand.l/r` | **19 finger bones each, by ancestry** |
| thigh_l/r | **`thigh_twist.l/r`** | `thigh_stretch` |
| calf_l/r | `leg_stretch.l/r` | `leg_twist` |
| foot_l/r, ball_l/r | `foot.l/r`, `toes_01.l/r` | — |

Nothing was placed by position, nothing synthesised. **What the measurement
changed:** the first cut of the Auto-Rig Pro table put `arm_stretch` first, and
its head is not the shoulder — `arm_stretch.l` starts halfway down the upper arm
(0.784, 3.438), with `arm_twist.l` at the shoulder; the thigh is the same
(`thigh_twist` at the hip, `thigh_stretch` at mid-thigh), while the lower limbs
are the other way round (`forearm_stretch` at the elbow, `forearm_twist` near the
wrist; `leg_stretch` at the knee, `leg_twist` at mid-calf). Arms that pivoted at
mid-bicep and legs at mid-thigh would have passed every numeric check; the table
now lists the bone whose head is the joint first, and the test holds it.

Auto-Rig Pro's deform bones hang from the rig's root, not from each other
(`arm_stretch.l`, `forearm_stretch.l`, `forearm.l` → `hand.l`, `thigh_stretch.l`
and `leg_stretch.l` are children of the trajectory controller `c_traj`; only
`arm_twist.l` hangs from the shoulder controller), so
prepare REBUILDS the skeleton on our joints instead of driving the source's
hierarchy (D191).

### 3. What prepare made

| | before | after |
|---|---|---|
| triangles | 17,473 (14,614 without the control shapes) | **5,996** (budget 6,000) |
| — HOOD / TUNIC / `old_steel_01.001` / `old_steel_01` / CLOAK | 1,049 / 2,180 / 7,664 / 2,718 / 564 | 410 / 855 / 3,006 / 1,066 / 220 |
| — CLOAK_PINS / CLOAK_ROPE / BELT_BUCKLE_METAL (under 300: kept whole) | 280 / 45 / 114 | 280 / 45 / 114 |
| joints | 339 (68 weighted) | 23: `root` + our 22 |
| nodes | 470 | 25: the model, its body mesh, 23 joints (445 dropped: the rig, the control shapes, Sketchfab's wrappers) |
| upper arm below the horizontal | **60.0° / 60.0° (A)** | **0.0° / 0.0° (T)**, read back from the written file's inverse bind matrices |
| height | 4.643 units | 1.9139 m (×0.4122), facing +Z, feet at 0 |
| textures | 6 | 5 (the cloak's copy of the hood's base colour deduplicated), all 1024 px, none resized |
| file | a 4.2 MB glTF + bin + PNGs | `model.glb`, **2,339,352 bytes** — 2,238,326 of them the five PNGs |

The re-pose turned each upper arm 60.0° and each forearm a further 8.6° onto the
`agent` body's bind directions, baked through the new skin weights (the renderer's
linear blend), and wrote the inverse bind matrices from the new pose. The CLOAK
(324 vertices) was skinned by the height rule — `spine_03` above its bind height,
blends down through `spine_02` to `pelvis`, `pelvis` below. The manifest validates
and carries the credit line from the file (`This work is based on "Doctor Doom"
(…) by RadioactiveAG (…) licensed under CC-BY-4.0 (…)`).

**Two defects the first runs found, fixed before the numbers above.** meshopt's
quantize gave each of eight mesh NODES its own transform, and so eight copies of
the skin; the parts are now primitives of one skinned mesh, as the `agent` body
is. And the part names had read their ancestors root-first, naming the cloak after
the whole character.

**The write guard, measured:** a prepare run with `--drop`, `--bind`, `--pose
none` and a 4,000 budget, then `find -newer` over the worktree and the session
scratchpad: nothing written outside `personal/models/doctor-doom/`. (`--pose none`
kept the 60° A; `--bind 'CLOAK$=spine_03'` bound the cloak wholly to `spine_03`;
`--drop CLOAK_ROPE` removed the rope.) **Deterministic:** two runs of the
canonical command wrote the same `model.glb`, sha256 `de229ad3…62c60c52`.

### 4. The retarget is the build's

`check.mjs` step 0 carries `figures.glb`'s `agent` clips onto `hero` with
`tools/personal/retarget.mjs` and compares with `hero`'s own baked clips — both
were baked by `build-figures.mjs` from the same library clip, and the
world-space delta composes (library → agent → hero ≡ library → hero). Worst joint
over five phases × 22 joints: idle 0.60°, attack 0.60°, hit 0.65°, **die 0.77°**,
kneel 0.60° — the meshopt clip compression, not 0. **Control:** with the bind
offset dropped from `retarget.mjs` (local rotations copied), step 0 reads 8.54°
and fails, and so does the web test.

### 5. Our clips on Doom (`check.mjs`)

The model loads with three's `GLTFLoader` and `MeshoptDecoder` in Node; the
skeleton is `root` + our 22; at rest every joint's `boneWorld × boneInverse` is
the same matrix — **0.000 mm** between where any vertex's joints would put it.
The five clips of `models.json`'s `agent` set, carried on, sampled at t = 0, 0.5
and 1:

| clip @ t | bounds (m) | largest side vs rest | centre moved | cloak vs spine_02's carry |
|---|---|---|---|---|
| idle @ 0.5 | 0.85 × 1.86 × 0.74 | 0.92× | 0.05 m | 0.056 m |
| attack @ 0.5 | 0.82 × 1.79 × 1.22 | 0.89× | 0.30 m | **0.175 m** (the torso twists; the cloak blends three joints, the reference is one) |
| hit @ 0.5 | 0.85 × 1.88 × 0.74 | 0.93× | 0.07 m | 0.052 m |
| die @ 1.0 | 1.22 × 0.50 × 2.29 | 1.14× | 1.13 m | 0.064 m (the cloak moved 1.36 m, the spine 1.49 m) |
| kneel @ 0.5 | 0.88 × 1.80 × 1.03 | 0.89× | 0.52 m | 0.031 m |

Rest: 2.016 × 1.913 × 0.443 m. Every bone matrix and every skinned vertex finite
at all fifteen samples. The limit is 1.5× the rest's largest side (a lying-down
death stays inside that cube; per-axis containment would fail it), and the cloak's
is 10% of the height (0.19 m).

**Joint coverage** — each joint's OWN rotation from bind, the largest over every
frame of the five clips, on Doom and on the agent, and the largest gap between
their world-space deltas. **The two rotation columns are equal, and Δ is near
zero, by construction** (the verifier's finding, round 1): prepare builds every
skeleton in the `agent`'s bind rotations and these are the `agent`'s clips, so
the equality holds for ANY rig map and proves the retarget, not the map. The
discriminating checks are the `verts` column, the rest identity, the bounds and
the cloak above — and, since fix pass 1, the weight, side, facing and shape
checks of §13:

| joint | verts | Doom° | agent° | Δ° |
|---|---|---|---|---|
| pelvis | 11.4% | 101.5 | 101.5 | 0.03 |
| spine_01 / 02 / 03 | 0.5 / 2.6 / 2.0% | 30.5 / 37.0 / 34.2 | same | ≤ 0.04 |
| neck_01 / Head | 0.2 / 25.3% | 40.6 / 36.9 | same | 0.04 |
| clavicle_l / r | 4.4 / 4.3% | 21.4 / 28.4 | same | 0.60 / 0.39 |
| upperarm_l / r | 4.1 / 3.8% | 94.5 / 75.2 | same | 0.19 / 0.23 |
| lowerarm_l / r | 3.4 / 4.0% | 138.4 / 128.3 | same | 0.16 / 0.18 |
| hand_l / r | 5.3 / 5.4% | 78.1 / 84.3 | same | 0.16 / 0.43 |
| thigh_l / r | 3.2 / 3.3% | 114.1 / 87.0 | same | 0.31 / 0.16 |
| calf_l / r | 4.3 / 4.7% | 133.6 / 123.7 | same | 0.24 / 0.16 |
| foot_l / r | 3.6 / 3.3% | 59.1 / 88.9 | same | 0.13 / 0.25 |
| ball_l / r | 0.5 / 0.5% | **0.0** / 39.7 | 0.5 / 39.7 | 0.11 / 0.42 |

**21 of 22 joints turn on their own; `ball_l` is still in all five clips on the
agent too** (its 0.5° is the agent clip's compression noise, under the 1° line).
Every world-space delta is within 0.60° of the agent's. 3,859 vertices. The head
dominates a quarter of them: the hood and the mask are the densest part of the
model.

### 6. Negative controls

(Fix pass 1 re-ran every row below and added six rig-map controls, two of which
this first `check.mjs` passed: §13.)

| broken on purpose | what fails |
|---|---|
| the cloak's weights moved to `root`, which never moves | 4 assertions: 1.41 m off the spine in the death, 0.55 m in the kneel, "the cloak did not follow the spine in the death (moved 0.00 m, spine 1.50 m)" |
| `lowerarm_l`'s inverse bind matrix off by 1 m | "at rest the skin moves a vertex 1.0000 m from where the file puts it" |
| `calf_l` renamed `knee_l` | "the skeleton is not root + our 22 joints", "model.glb has no joint calf_l" — a clean FAIL, not a crash |
| `retarget.mjs` without its bind offset | step 0 at 8.54°, and `personal-tier.test.ts` |
| `.gitignore` with `personal/` unanchored | the test's negative control: `tools/personal/lib.mjs` is ignored |
| `.gitignore` without the rule | "`personal/models/doctor-doom/model.glb` is NOT ignored" |

The exploded-IBM control passed the first `check.mjs`, which judged only the
posed bounds against the rest's — a rest pose that is already broken moves the
yardstick with it. The rest-identity assertion was added for it. (The mutated
copies lived under `personal/models/control-*` and were deleted.)

### 7. The previews

Front, side (its left), back, attack at t = 0.5, a sheet of the four, and the
kneel and the death from the side, 800 × 800, rendered by headless Chromium on
**ANGLE's SwiftShader** (`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device
(Subzero)))`), lit plainly — a look at the model and its textures, not the
arena's comic shading. What they show: a T-posed Doom standing on the floor, the
hood and mask, the gold clasps and belt read, the cloak hanging behind; the
attack a cross punch with the guard hand at the face and the cloak swinging with
the torso; the kneel with the cloak down the back; the death on its back, arms
overhead, the cloak under it.

**The first preview run drew nothing**: `tools/arena-bench.mjs`'s own SwiftShader
flags (`--use-gl=swiftshader --enable-unsafe-swiftshader`) no longer start the GPU
process on this Chromium ("Requested GL implementation (gl=none,angle=none) not
found in allowed implementations: [(gl=egl-angle,angle=default)]"), and every
view came back with the WebGL context lost, 0 draw calls, all pixels 0. A bare
`getContext` test passed, which is why the page now reports its draw calls, its
centre pixel and `isContextLost()`, and `check.mjs` fails on a lost context.
`--use-angle=swiftshader` works; `--gpu gl` (the GTX 1080) works too.
arena-bench was not re-run here (PLAN.md follow-up 9).

### 8. The tests

(Fix pass 1 added seven — the height rule, `judgeBody`, the net-log reader and
the whole pipeline end to end on a figure of boxes: §13.)

`web/test/personal-tier.test.ts`, 16 cases under `node --test`, 0.24 s: the
ignore rule both ways (and git tracking nothing under `personal/`); the slug on
eight names and nine non-slugs; the write guard; the manifest validator on a good
manifest and eighteen single defects; our joints against the assets manifest and
`figures.glb`'s agent hierarchy; the rig map over synthetic Auto-Rig Pro (Doom's
spellings, suffixes and controllers), Mixamo (two namespaces), Unreal UE5 (plus a
suffixed copy — `spine_01_102` is `spine_01`, not `spine`), VRoid, a VRM
`humanBones` table and a `bones.json` override (and its three errors); the rest
pose on a box on two bones built in the test — 45° and 30° A, 0° and 8° T, 80°
down — and the control-shape, unskinned and game-name flags on the same fixture;
and the retarget against the build's clips.

### 9. What a Blender session would still improve on Doom

- **The cloak** is one flat sheet hanging from the shoulders, bound by height to
  the spine and the pelvis. It follows the body (§5) but not the legs: a stride or
  the kneel's forward knee would pass through it where it hangs in front, and it
  lies under the body in the death. Weights down the thighs, or a cloth
  simulation baked to bones, are Blender work.
- **The shoulders.** A 60° A → T turn baked through a linear blend shears
  whatever is weighted across the clavicle and the upper arm — here the steel
  pauldrons, rigid plates. They read well at the previews' size; at a close look,
  weighting each plate wholly to one joint (or re-posing in Blender with the plates
  parented) is better.
- **The twist bones** are merged into one joint per segment; a forearm roll now
  twists at the elbow. Our clips roll little; a Blender export keeping a twist
  bone per segment, and a loader that drives it, would be the fix.
- **The fingers** are merged into the hand. Our clips do not drive fingers, so
  nothing is lost today.
- **The decimation** is 41% on the big parts, uniform. A hand decimation would
  keep the mask's features denser than the armour's flat plates.

### 10. The runner-ups, and the Mixamo map

- **Coulson** (patromes; Reallusion Character Creator; 92,719 triangles, 25
  materials, 46 textures, a 144.6 MB GLB). The automatic map knows `CC_Base_*`
  (the hip and pelvis, waist, two spines, the neck twists, and each limb's twist
  and share bones), and `--height` absorbs Character Creator's centimetres. It
  needs `--drop` for the eye, teeth, tongue, tear-line, eye-occlusion and stubble
  layers (transparent meshes a figure cannot show), a budget chosen by looking —
  6,000 would keep 6.5% — and the texture step will drop the roughness, metal and
  occlusion maps and downscale the rest. Likely an A-pose; `--pose t` handles it.
- **Wasp** (MoraAzul; a custom rig with Spanish part names; posed; unskinned
  wings; a base plane and a shadow disc). The automatic map will find nothing: a
  `bones.json` written from `inspect.json`'s joint list. `--bind 'Ala=spine_03'`
  for the wings and `--drop` for the base and the disc. The pose is the hard part:
  the re-pose turns the arms only, so a hand on a hip is fixed but the legs and the
  spine keep their pose under every clip — `--pose all` (PLAN.md follow-up 10) or
  Blender. Its original is FBX: take Sketchfab's autoconverted glTF.
- **Mixamo** is the most common rig a downloaded humanoid arrives on, and its map
  is built in (`mixamorig:` and `mixamorig<n>:` namespaces, the test holds both);
  the guide writes it out as the `bones.json` pattern.

### 11. `~/forge` and `~/.forge`

Fingerprinted before the work and after the gate (the `~/forge` jar's sha256, a
listing of `~/forge`'s top level with sizes and times, and a sha256 of every
file's path, size and time under `~/.forge` — 7 files; `decks/constructed/` is
empty): **unchanged** (`var/personal-tier/forge-before.txt`,
`forge-after.txt`, identical).

### 12. The gates

- `./bridge/build.sh`: OK, 3.7 s (no bridge change).
- `npm --prefix web test`: **949 / 949 pass / 0 fail / 0 skipped** `node --test`
  (933 on `main` + this lane's 16) and vitest **120 (8 files)**.
- `npm --prefix web run build`: OK; `grep -r` of `web/dist` for `personal/models`,
  `doctor_doom` and `model.glb`: nothing.
- `rm -rf bridge/out && GATE_JOBS=4 WSPORT=9000 ./tools/check-all.sh`:
  **`check-all OK`, 255.3 s**, 48 jobs whose seconds sum to 987.8 s, at a load
  average of 5.3–16.3 beside another lane's gate (`var/check-all-personal-tier.log`,
  run `20260928-202142-1712672`); inside it `node --test` **959 / 951 pass / 0
  fail / 8 skipped** and vitest **120 (8 files)**. The lane added no step and no
  job: its test is in the web step, and the pipeline itself is by hand (it needs
  the user's download).

---

### 13. Fix pass 1 — a check that can fail on a wrong map, and a browser that stays home (D192)

The verifier's round 1 passed the lane and found two majors and three minors. It
ran two wrong rig maps through `prepare` and `check`: (c) the left hand mapped to
the unweighted controller `c_hand_fk.l_231`, and (b) the arms named side for
side. Both printed `moved yes`, 21/22 and exit 0 — the rotation columns hold by
construction (§5). It also found `check.mjs`'s Chromium profile under
`var/personal-tier/chromium-profile/` holding a 2.3 MB copy of `model.glb` in its
HTTP cache, and requests to Google in the same cache. Everything below was run
again from the user's zip (sha256 `92ea148e…42741791` before and after), in the
same order: import, prepare, check, the controls, the gate. `model.glb` came out
**byte-identical** (sha256 `de229ad3…`). Only the manifest changed: it gained
`rig.placement` and each joint's `primaryWeighted`.

**Cleaned first.** The builder's two old Chromium profiles
(`var/personal-tier/chromium-profile/`, 8.3 MB with the cached `model.glb`, and
`chromium-dbg/`, 3.5 MB) and the page under `var/personal-tier/preview/` were
deleted.

**What `check.mjs` judges now** (`lib.mjs`'s `judgeBody`, against the `agent`
body in `figures.glb`; the agent's fingers, twists and extra spine joints count
as their joint of ours):

| check | fails when | Doom |
|---|---|---|
| weight | a core joint the agent's skin uses (≥ 0.1%) carries < 0.01% on the model (non-core: a warning; a synthesised joint: a note) | 22/22 joints carry weight. Pelvis 7.2% vs the agent's 12.5%, Head 24.9 vs 17.8, hands 5.1/5.3 vs 3.5/4.0, the balls 0.5/0.4 vs 1.2 |
| placement | weighted source bones placed BY POSITION carry > 2% of the skin weight (any at all: a warning) | 38 by ancestry (the fingers), 0 by position |
| sides | an `_l` joint on the other side of its `_r` from the agent's, or a sided joint's vertices on the other side | 24/24 judged, all on the agent's side |
| facing | a foot's vertices behind its ankle where the agent's are in front | left 0.023 m in front (agent 0.085), right 0.025 m (agent 0.084) |
| shape | a segment more than 60° from the agent's (the arm segments are judged by side only; `--pose t` turns them onto the agent's by construction) | 15/15; widest `neck_01 → Head`, 36.2° |

Two warnings print on the correct map: `upperarm_l/r` stand where `arm_twist.l/r`
stand, and those bones carry no weight. Their weight is on `c_arm_twist_offset`,
a follower, and their head is the shoulder (§2). An unweighted primary is
therefore a warning and never a failure.

**The rig-map controls, on Doom** (each in `personal/models/control-<name>/`,
deleted afterwards; the logs are in `var/personal-tier/fix1/`):

| wrong map (`bones.json`) | prepare | check |
|---|---|---|
| `hand_l` → `c_hand_fk.l_231` (the verifier's c) | exit 0, and it WARNs: `hand_l` stands on an unweighted bone; 20 weighted bones, 9.45% of the weight, placed by position | **exit 1**, 2 failures: "hand_l ← c_hand_fk.l_231 carries no skin weight (the agent's hand_l carries 3.5%)"; 20 bones, 9.4%, placed by POSITION |
| upper arm, forearm and hand swapped l↔r (the verifier's b) | exit 0 (the figure is turned 180°, as the verifier saw) | **exit 1**, 21 failures: the clavicles, thighs, calves, feet and balls on the wrong side (9/24 sides right), **both feet pointing backwards** (0.022 / 0.024 m behind the ankle), `pelvis → thigh` 169°, `foot → ball` 130° |
| the same with the clavicles | exit 0 | **exit 1**, 18 failures (12/24 sides right, both feet backwards, four segments) |
| every side swapped (a full mirror) | exit 0 | **exit 1**, 4 failures. All 24 sides agree after the turn; **only the feet say so**: both point backwards, and `foot → ball` is 130° off on both sides |
| `thigh_l` ↔ `calf_l` | exit 0 | **exit 1**: `thigh_l → calf_l` 172°, `pelvis → thigh_l` 74° |
| `neck_01` → `c_neck.x_199` (a controller at the neck) | exit 0, WARN | exit 0 with a WARN. The joint still carries weight (`neck_twist.x` by ancestry), and the controller stands at the neck. This is the benign case the warning is for |

The earlier mutants, re-run on the new tool against copies of `model.glb`, all
still fail as before. With the cloak's weights on `root`: 4 failures (1.409 m
and 1.417 m off the spine in the death, 0.552 m in the kneel, "did not follow").
With `lowerarm_l`'s inverse bind matrix off by 1 m: "moves a vertex 1.0000 m".
With `calf_l` renamed `knee_l`: "the skeleton is not root + our 22 joints".

**The preview browser.**

- The page is answered from memory. Nothing is written under `var/`.
- Every answer is `Cache-Control: no-store`.
- The profile is `personal/models/<slug>/.preview-profile/`. It is removed in a
  `finally` once Chromium has exited, which the tool waits for.
- Chromium runs with `--incognito`, disk and media caches of 1 byte, background
  services off (`--disable-background-networking`, `--disable-component-update`,
  `--disable-sync`, `--disable-domain-reliability`,
  `--disable-client-side-phishing-detection`, `--disable-breakpad`,
  `--no-first-run`, and `--disable-features` for spellcheck, optimization hints,
  translate, media router, autofill, CT updates and network-time queries), and
  `--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1`.
- Chromium's own net log is written into the profile, read back and then
  deleted.

On Doom it read:

- 12 requests to 127.0.0.1;
- **background requests Chromium still tried**: signin's
  `accounts.google.com/ListAccounts` ×2 and a `www.google.com/async/…` call ×2.
  Each was answered "not found" by the resolver rule;
- **0 DNS queries, 0 TCP connections beyond the loopback, 0 bytes sent beyond
  it**;
- two UDP sockets `connect()`ed to `2001:4860:4860::8888`. This is Chromium's
  IPv6-reachability probe (`HOST_RESOLVER_MANAGER_IPV6_REACHABILITY_CHECK` in
  the log), and it sends nothing.

Two earlier probe runs, with no page loaded, also tried
`clients2.google.com/time`, the network-time check (it stopped once
`NetworkTimeServiceQuerying` was disabled), and GCM's
`android.clients.google.com/checkin`, which appeared in both probes but not in
the check run. The run
fails on any connection, byte, DNS query or answered request beyond the
loopback. The reader's negative controls are a synthetic net log in the test,
because a live one would mean letting Chromium reach Google (D192's rejected
alternative). After the run, no `.preview-profile/` is left, and `find -newer`
over the worktree shows only this lane's edited sources and the logs under
`var/personal-tier/fix1/`.

Outside the worktree, the snap Chromium's own launcher touched two **empty**
marker files under `~/snap/chromium/common/.cache/` (`mesa_shader_cache/marker`,
`radv_builtin_shaders/marker`) and a 40-byte crash-reporter `settings.dat`. Any
Chromium start does this, arena-bench included. None of it holds a byte of the
model. (This list was incomplete: the launcher also re-links an ibus socket
path under `~/snap/chromium/3520/.config/`, which fix pass 2 names — §14.)

The previews were re-taken: 7 PNGs, drawn by ANGLE SwiftShader with 7 draw calls
and 4,933 triangles in the last view. The sheet shows the textured T-pose front,
side and back, and the attack. `check.mjs` with previews took 1.6 s.

**The tests** — `web/test/personal-tier.test.ts`, 16 → **23 cases**:

- the cloak's height rule (`heightWeights`, now shared with prepare);
- four `judgeBody` cases on synthetic stick bodies: the agent's own shape
  passes; a core joint with no weight fails, while a synthesised or non-core
  one is a warning; placement over the limit fails; swapped arms, a full mirror
  and a thigh↔calf swap each fail on the right line;
- the net-log reader on a synthetic log. It tells "tried" from "reached", reads a
  log cut short, and flags a TCP connect, a byte sent, a DNS query and an
  answered request;
- **the whole pipeline end to end**. A 25-bone Mixamo-named figure of boxes
  (23 weighted bones, an unweighted `HandIndex1` leaf, arms 45° down, an
  unskinned cape behind the back; CC0 by construction) is written into a
  throwaway `personal/models/selftest-<pid>/`, which the test deletes. Then
  `import.mjs` (Mixamo 22/22, A 45°/45°, the cape flagged), `prepare.mjs` (the
  manifest validates, A → T read back at 0°/0°, the cape skinned by height, and
  the written file's cape vertices dominated by `pelvis`, `spine_02` and
  `spine_03`), and `check.mjs --no-preview` (exit 0, skinned-vs-file 0.000 mm,
  22/22 carry weight, every side right) run as child processes. Then the
  verifier's two wrong maps are written as `bones.json`, and `check.mjs` must exit 1
  on "hand_l ← mixamorig:LeftHandIndex1 carries no skin weight" and on "the …
  foot points BACKWARDS".

The case takes 1.3 s. **Its negative control:** with `check.mjs`'s
`judgeBody` failures commented out, the case fails ("the hand on a bone with no
weight: check passed it"). The file's other 22 cases take 0.3 s.

**A third defect, found by re-running §6's controls.** The `.gitignore` mutants
from round 0 were re-run after that round's commit. The unanchored rule
(`personal/` in place of `/personal/`) **no longer failed the negative control**.
Git never reports a tracked file as ignored, so once `tools/personal/` was
committed, `git check-ignore tools/personal/lib.mjs` said "not ignored" under
either rule. The control had passed in round 0 only because the files were not
yet tracked. `gitIgnores` now asks with `--no-index`, which judges the patterns
alone. With that change the unanchored rule fails the control
("tools/personal/lib.mjs is ignored"). The missing rule fails the other half, as
before. The retarget mutant (bind offset dropped) still fails `check.mjs` step 0
at 8.54° and the web test.

**Gates, fix pass 1.**

- `./bridge/build.sh`: OK.
- `npm --prefix web test` standalone: **956 / 956 pass** under `node --test`
  (949 + 7), and vitest **120 (8 files)**.
- `npm --prefix web run build`: OK. `web/dist` holds no `personal/models`,
  `doctor_doom`, `model.glb` or `preview-profile`.
- `rm -rf bridge/out && GATE_JOBS=4 WSPORT=9000 ./tools/check-all.sh`, run twice:
  - **Before the `--no-index` fix**: **`check-all OK`, 242.6 s**, 48 jobs
    summing to 935.5 s, load 2.3–6.6 (`var/check-all-personal-tier-fix1-run1.log`).
  - **After it**, the tree as fix pass 1 left it (uncommitted until fix pass 2,
    §14): **`check-all OK`, 246.2 s**, 48 jobs
    summing to 955.5 s, load 1.4–8.8 (`var/check-all-personal-tier-fix1.log`,
    run `20260928-205747-2235118`). Inside it, `node --test` ran **966 / 958 pass
    / 0 fail / 8 skipped**, with the end-to-end case at 3.7 s, and vitest ran
    **120 (8 files)**.
- `~/forge` and `~/.forge` were fingerprinted before and after this pass. The
  fingerprint covers the jars' sha256, `~/forge`'s top level, and a sha of every
  `~/.forge` file's path, size and time and of its contents (7 files; the
  constructed-deck tree empty). **Unchanged**
  (`var/personal-tier/fix1/forge-before.txt` = `forge-after.txt`).
- The user's zip is still sha256 `92ea148e…`.

---

### 14. Fix pass 2 — committed, the ranges and the launcher named

The verifier's round 2 passed the lane. It re-ran the whole pipeline from its own
copy of the zip, got the same `model.glb` (sha256 `de229ad3…`, 2,339,352 B),
measured the T-pose from the inverse bind matrices with its own script (60.0° in
the source, 0.0° in `model.glb`), wrote two wrong maps of its own, and ran the
gate at `WSPORT=9003`. It found one major and three minors:

| finding | what was done |
|---|---|
| **major** — fix pass 1 was not committed, on the claim that `main`'s `CLAUDE.md` still said *"Do not run `git commit`"* | The claim was false. `main` had replaced *The user commits* with *Commits, branches and merges* (**D201**: Claude commits on branches and merges when the gate is green) at `f2c934d`, before fix pass 1's gate. Only this worktree, at `a08c15f`, still carries the old text. Fix pass 1 and this pass are now committed on `personal-tier` under D201, nothing under `personal/` among them, and the branch is still a fast-forward of `a08c15f`. |
| minor — `CLAUDE.md`'s heading said D190–D191 while the section cited D192 | The heading, the docs table's guide row and PLAN's row now say D190–D192. PLAN's section heading says it too, and the guide's and this document's openings name D192. The move into `main`'s nested `CLAUDE.md` files is a merge job: PLAN.md follow-up 18. |
| minor — the snap launcher's writes outside the repo were half named | Both are named in D192, the guide and `CLAUDE.md`'s convention 3. They are measured below. |
| minor — `retarget.mjs` copies the build's formula rather than importing it | No change. The copy is proven equal (agent → hero, worst joint 0.77°) and the bind-offset mutant still fails it (below). Factoring stays PLAN.md follow-up 8, beside a rebuild of `figures.glb`. |

The verifier also found a conflict for the merge: `main`'s *Commits, branches and
merges* says a personal-only asset is recorded in `tools/assets-manifest.json`
as `committable: false`. D190 rejected that. PLAN.md follow-up 19 records it.

**Doom, again, from a clean folder.** `personal/models/doctor-doom/` was deleted
and rebuilt from the user's zip (sha256 `92ea148e…42741791` before and after),
with the same three commands. The results:

- import: 0.16 s, 17,473 triangles (14,614 render + 2,859 in rig control
  shapes), 6 textures, 339 joints with 68 weighted, Auto-Rig Pro 22/22 (unreal
  scored 6), A-pose 60°/60°;
- prepare: 0.46 s, 5,996 triangles, 60°/60° → 0°/0° read back from the file,
  the cloak (324 vertices) skinned by height, 5 textures at 1,024 px;
- check: 1.76 s with the previews, exit 0.

`model.glb` is **byte-identical** to fix pass 1's (sha256 `de229ad3…`). So are
**all seven previews**: `front`, `side`, `back`, `attack`, `kneel`, `die` and
`sheet` have the same sha256 as before the folder was deleted. `inspect.json` and
`manifest.json` carry fresh timestamps (`inspectedAt`, `date`), so their own
hashes changed. A second import and prepare, into a throwaway slug deleted
afterwards, differed from these files only in the slug, the timestamps and
`model.glb`'s hash; the GLB's binary chunk was identical and its JSON names the
slug. The check's numbers are fix pass 1's:

- rest error 0.000 mm;
- every posed bound 0.89–1.14× the rest;
- 21/22 joints turned (`ball_l` is still on the agent too), 22/22 carry weight;
- sides 24/24, feet 0.023 / 0.025 m in front of the ankles, shape 15/15;
- 38 bones placed by ancestry, 0 by position;
- 12 requests to 127.0.0.1, 0 DNS queries, 0 TCP connections and 0 bytes beyond
  the loopback.

The contact sheet, looked at again, is the verifier's description: a textured
Doom in a level T-pose from the front, side and back, the cloak attached behind,
and the attack at t = 0.5 with the cloak following the torso.

**The controls, again, with the verifier's two maps added**
(`var/personal-tier/fix2/controls.mjs`; logs beside it; every control folder
deleted afterwards):

| control | prepare | check |
|---|---|---|
| `hand_l` → `c_hand_fk.l_231` | exit 0, WARN | **exit 1**, 2 failures: `hand_l` carries no skin weight; 20 bones, 9.4% of the weight, placed by position |
| arms swapped l↔r | exit 0 | **exit 1**, 21 failures: 9/24 sides, both feet backwards, `pelvis → thigh_l` 168.5° |
| arms and clavicles swapped | exit 0 | **exit 1**, 18 failures: 12/24 sides, both feet backwards |
| a full mirror | exit 0 | **exit 1**, 4 failures: only the feet say so (backwards; `foot → ball` 130°) |
| `thigh_l` ↔ `calf_l` | exit 0 | **exit 1**, 2 failures: `thigh_l → calf_l` 172°, `pelvis → thigh_l` 74° |
| `neck_01` → `c_neck.x_199` | exit 0, WARN | exit 0 with a WARN (the benign case, §13) |
| **legs mirrored l↔r** (the verifier's) | exit 0 | **exit 1**, 14 failures: 12/24 sides, `pelvis → thigh` 168.5° |
| **`Head` → `c_spine_03.x_247`, `foot_l` → `c_foot_ik.l_406`** (the verifier's) | exit 0, WARN | **exit 1**, 3 failures: 21/22 carry weight ("Head … carries no skin weight", the agent's carries 17.8%), 2 bones and 31.2% of the weight placed by position, `neck_01 → Head` 160° |
| the cloak's weights on `root` | — | **exit 1**, 4 failures: 1.409 / 1.417 m off the spine in the death, "did not follow" |
| `lowerarm_l`'s inverse bind matrix off by 1 m | — | **exit 1**: "moves a vertex 1.0000 m" |
| `calf_l` renamed `knee_l` | — | **exit 1**: "not root + our 22 joints" |

The verifier's legs-mirrored run failed 15 assertions and placed 3.8% of the
weight by position; this one failed 14 and placed none. The verifier's
`bones.json` is not in this worktree, so the difference is not traced. This map
swaps each joint's primary bone together with its followers, which leaves no
weighted bone unnamed. Both runs fail on the sides and on `pelvis → thigh`.

**The source mutants, again** (`var/personal-tier/fix2/mutants.sh`, after the
gate; it restores both files and checks them against `HEAD`):

- `.gitignore` with the rule unanchored (`personal/`): `personal-tier.test.ts`
  fails the negative control, "tools/personal/lib.mjs is ignored".
- `.gitignore` with the rule removed: it fails the other half,
  "personal/models/doctor-doom/model.glb is NOT ignored".
- `retarget.mjs` without the bind offset: the web test fails at 8.44°, and
  `check.mjs` step 0 fails at 8.54° ("does not reproduce the build's hero
  clips").

All three are fix pass 1's results. The `--no-index` fix still holds, now that
every file of the pipeline is tracked.

**What the tools wrote outside the repo.** A marker file was touched before the
Doom run. After the run and the controls, `find -newer` over `~/snap`,
`~/.config`, `~/.cache`, `~/.local`, `~/.pki`, `/tmp` and `~/code` found this
lane's folder and two paths, both the snap Chromium **launcher's**:

- `~/snap/chromium/common/chromium/Crash Reports/settings.dat`, a 40-byte
  regular file (the crash reporter's own state), rewritten;
- `~/snap/chromium/3520/.config/ibus/bus`, a 31-byte **symbolic link** to
  `~/.config/ibus/bus`, re-created with its directory's time.

The launcher runs before Chromium does. No Chromium flag reaches it, and any
Chromium start does the same, `tools/arena-bench.mjs` included. Neither path
holds a byte of the model. Fix pass 1's run also touched two empty marker files
under `~/snap/chromium/common/.cache/`; this run did not. The other entries under
`~/snap` were the user's own Firefox profile, which the tools do not start.

**Gates, fix pass 2.**

- `./bridge/build.sh`: OK, 3.0 s.
- `npm --prefix web test` standalone: **956 / 956 pass** under `node --test`
  (23 of them `personal-tier`), and vitest **120 (8 files)**.
- `npm --prefix web run build`: OK. `web/dist` holds no `personal/models`,
  `doctor_doom`, `model.glb` or `preview-profile`.
- `rm -rf bridge/out && GATE_JOBS=4 WSPORT=9000 ./tools/check-all.sh`, with step
  10 on ports 9000–9006: **`check-all OK`, 240.4 s** (4 m 0.5 s by `time`), 48
  jobs summing to 934.4 s, at a load average of 2.19–7.59
  (`var/check-all-personal-tier-fix2.log`, run `20260928-211630-2482174`). Inside
  it, `node --test` ran **966 / 958 pass / 0 fail / 8 skipped** and vitest ran
  **120 (8 files)**. The docs were edited before the gate. This section and
  PLAN.md's gate line were written after it; no test reads either file.
- `~/forge` and `~/.forge` were fingerprinted before this pass and after the
  mutants. The fingerprint covers the jars' sha256, `~/forge`'s top level, and
  every `~/.forge` file's path, size, time and contents. **Unchanged**
  (`var/personal-tier/fix2/forge-before.txt` = `forge-after.txt`).
- The user's zip is still sha256 `92ea148e…42741791`.
- Committed on `personal-tier` (fix pass 1 and this pass together). `git status
  --ignored` shows `personal/` as ignored, and the commit adds no file under it
  and no binary. `git merge-base --is-ancestor a08c15f HEAD` holds.
