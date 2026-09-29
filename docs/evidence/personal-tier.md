## The personal tier, phase 1 — the folder, the manifest, the pipeline, and Doctor Doom through it (2026-09-28)

Worked in the worktree `/home/justin-a/code/mtg-table-t2x` on branch
`personal-tier`, from `main` at `a08c15f`, and rebased onto `main`'s `f2c934d`
in fix pass 3 (§15). Decisions **D190** (the tier and its two-tier rule),
**D191** (the pipeline's rules), **D192** (fix pass 1: how `check.mjs` judges a
rig map, and the preview browser's isolation) and **D193** (fix pass 3: the
limbs, and the preview browser's HTTP cache and profile), in the lane's reserved
range D190–D199; PLAN.md *The personal tier* has the status and phase 2;
`docs/guides/personal-tier.md` is the manual.

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
the equality holds for ANY rig map and proves the retarget, not the map. It is
not a measurement of the map, and the table below is not evidence that Doom's
map is right. The discriminating checks are the `verts` column, the rest
identity, the bounds and the cloak above; since fix pass 1, the weight, side,
facing and shape checks of §13; and **since fix pass 3, the limb check of §15
(D193) — each spine, arm and leg link's direction, each limb's proportion and
where each limb joint's flesh lies, which a map that swaps two joints of a chain
cannot pass and every one of these columns can**:

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

---

### 15. Fix pass 3 — the limbs (D193), the preview browser's cache, and the rebase onto `f2c934d`

The third skeptic round found one major and three minors. Everything below was
run from the user's zip (sha256 `92ea148e…42741791` before and after), with
`~/forge` and `~/.forge` fingerprinted before the first command. Logs, the
controls and the scratch scripts are under the worktree's gitignored
`var/personal-tier/fix3/`.

**The major, reproduced.** The skeptic's three `bones.json` files (its logs are
in `var/verify3/`) were run through the tools as they stood at `36a4dde`:

| the skeptic's map | `check.mjs` at `36a4dde` |
|---|---|
| a — the forearm and the hand swapped on both sides | **exit 0**, `OK — … takes our clip set` |
| c — the same on the left only | **exit 0**, `OK` |
| b — `spine_02` and `spine_03` swapped | exit 1: shape `spine_02 → spine_03` 176°, and the cloak off the spine |

Why a and c passed: the rotation columns hold by construction (§5); the weight
still lands on all 22 joints; the sides are right; and **prepare's A → T turns
each arm link onto the agent's direction whatever it pointed at** — the swapped
forearm pointed back along the upper arm and was turned 177.5° (the manifest's
`pose.turnsDeg`), so D192's shape check skipped the arms on purpose. The bounds
test cannot see a fold: the arm gets shorter.

**Measured before it was written** (`var/personal-tier/fix3/measure.mjs`, on the
`hero` body against the `agent`, on Doom's right map and on the swaps): each
link's direction, its length against the link before it, and `s`, where the
vertices a joint dominates lie along its link (0 at the joint, 1 at the child).

| | the arm links' direction | forearm / upper arm, × the agent's | the swapped joint's `s` |
|---|---|---|---|
| hero, Doom | 0.0–0.7° | 1.06–1.07 | 0.35–0.60 |
| forearm ↔ hand, both sides | **0.0°** (turned) | **0.52** | **−0.42** |
| forearm ↔ hand, left | **0.0°** (turned) | **0.52** (left) | **−0.42** (left) |
| `spine_02` ↔ `spine_03` | `spine_02 → spine_03` **176°** | — | — |

The direction of a turned arm link says nothing; its proportion and its flesh
do — prepare turns the flesh with its joint, so the hand the swapped `lowerarm`
carries ends up BEHIND the wrist. The same numbers were read on the user's other
downloads, as calibration only (nothing about them leaves `var/` and their
folders were deleted afterwards): **Hulk** and **Nick Fury** (Mixamo, 22/22, A 45°
and 36.5°) pass every check, D193 included; the table below gives their extremes.

**The check** (`lib.mjs`'s `judgeLimbs`, `check.mjs` step 3b; D193): each link of
the spine `pelvis → … → Head`, each arm `upperarm → lowerarm → hand` and each leg
`thigh → calf → foot`, at rest —

- **direction** within 25° of the agent's (45° for the spine and the neck), a
  link with a synthesised end not judged, the arm links marked as turned by
  prepare under `--pose t` and measured under `--pose none`;
- **length**: the forearm over the upper arm and the calf over the thigh within
  1/1.6–1.6× the agent's same proportion (a limb link of no length fails);
- **flesh**: `s` above 0 wherever the agent's is at least 0.1;
- **the ends**: at attack t = 0.5, both hands, both feet and the head moved into
  the agent's half-space (cosine > 0), where the agent's moved ≥ 2% of its height.

`judgeBody`'s shape check keeps only pelvis → thigh, spine_03 → clavicle and
foot → ball (a fold used to fail twice). Prepare now WARNs on a forearm turned
more than 120°. The closing line was `OK — <slug> takes our clip set: its skin
weight, sides, facing and skeleton match the agent body's; every joint that
moves on the agent moves on it, by the same world-space delta; …` — the middle
clause holds by construction. It now lists what was judged, with its numbers,
and says the look is the previews'.

| model | limb links (max °) | spine links (max °) | forearm / upper arm | calf / thigh | limb `s` | ends at attack 0.5 (min cos) | check |
|---|---|---|---|---|---|---|---|
| hero (the build's own body) | 2.7 | 7.8 | 1.07 | 1.06 | 0.16–0.60 | 1.00 | (measure.mjs) |
| **Doom** | 7.7 | 36.2 (`neck_01 → Head`) | 1.06 | 0.94 | 0.35–0.56 | 0.98 | **exit 0** |
| Hulk | 3.3 | 18.6 | 1.20 | 0.71–0.72 | 0.40–0.70 | 0.92 | exit 0 |
| Nick Fury | 7.7 | 18.9 | 1.02 | 0.95 | 0.31–0.67 | 0.99 | exit 0 |

The limits sit outside all four: 25° against 7.7°, 45° against 36.2°, 0.63–1.6×
against 0.71–1.20×, and `s` > 0 against 0.16.

**Doom** (the final run, from a clean folder): import 0.13 s, prepare 0.46 s,
check with the previews 1.69 s, exit 0. `model.glb` is sha256 `de229ad3…`, and
all seven previews have fix pass 2's sha256s: the pipeline's output did not move
by a byte. Step 3b:

| link | dir° | limit | length× | `s` (model / agent) |
|---|---|---|---|---|
| pelvis → spine_01 / spine_01 → 02 / 02 → 03 / 03 → neck_01 / neck_01 → Head | 19.1 / 8.6 / 4.0 / 10.2 / 36.2 | 45 | — | — |
| upperarm_l → lowerarm_l, lowerarm_l → hand_l | 0.0, 0.0 (turned by prepare) | 25 | 1.06 | 0.49 / 0.40, 0.35 / 0.49 |
| thigh_l → calf_l, calf_l → foot_l | 7.7, 4.7 | 25 | 0.94 | 0.56 / 0.36, 0.41 / 0.60 |
| (the right side) | the same | 25 | 1.06, 0.94 | 0.40 / 0.40, 0.35 / 0.47; 0.52 / 0.32, 0.42 / 0.55 |

Ends at attack t = 0.5: `hand_l` 0.99, `hand_r` 1.00, `foot_l` 0.99, `foot_r`
1.00, `Head` 0.98. Shape: 6/6 branches and toes within 60°, widest
`spine_03 → clavicle_l` 25.6°.

**The controls** (`var/personal-tier/fix3/controls.mjs`: each map in
`personal/models/control-<name>/`, prepared from Doom's source and deleted
afterwards; the three mutants are copies of Doom's `model.glb`):

| control | prepare | check | what fails |
|---|---|---|---|
| **the skeptic's a — forearm ↔ hand, both sides** | exit 0, WARN folded 177.5° / 177.5° | **exit 1**, 4 | both sides: `the vertices lowerarm_l carries lie BEHIND it … (at -0.42 of the link; the agent's at 0.49)`, `lowerarm_l → hand_l is 0.51× as long as upperarm_l → lowerarm_l … 0.52× the agent's proportion` |
| **the skeptic's c — forearm ↔ hand, left** | exit 0, WARN folded 177.5° | **exit 1**, 2 | the same two, left only |
| **the skeptic's b — `spine_02` ↔ `spine_03`** | exit 0 | **exit 1**, 4 | `spine_02 → spine_03 points 176° away from the agent's (over 45°)`, and the cloak off the spine in the attack (3) |
| upper arm ↔ forearm, left | exit 0, WARN folded 170.4° | exit 1, 1 | `lowerarm_l → hand_l is 2.01× … 2.08× the agent's proportion` |
| calf ↔ foot, right | exit 0 | exit 1, 5 | 175°, `s` −0.08, 0.48×, the right foot backwards, and `foot_r` moving against the agent's at attack 0.5 (cosine −0.07) |
| `neck_01` ↔ `Head` | exit 0 | exit 1, 1 | `neck_01 → Head` 144° |
| thigh ↔ calf, left | exit 0 | exit 1, 5 | 172°, `s` −0.35, 1.85×, `pelvis → thigh_l` 74°, `foot_l` against the agent's at attack 0.5 (cosine −0.75) |
| earlier passes' maps: hand on a controller; arms swapped l↔r; the same with the clavicles; a full mirror; legs mirrored; `Head` and `foot_l` on controllers | exit 0 | exit 1: 2, 21, 18, 4, 14, 3 | as §13–§14 (the double 60°/45° line on `neck_01 → Head` is one line now) |
| `neck_01` on a controller (the benign case) | exit 0, WARN | **exit 0** | — |
| mutants: the cloak on `root`; `lowerarm_l`'s IBM off by 1 m; `calf_l` renamed | — | exit 1: 4, 1, 2 | as §13 |

The ends at attack t = 0.5 caught none of the skeptic's three: a folded arm's
hand is still carried the agent's way (cosine 0.98). They fire on the legs.

**The minors.**

- **The tests** (`web/test/personal-tier.test.ts`, 23 → 28 cases). Three
  `judgeLimbs` cases on stick bodies: the agent's own shape passes (and a
  synthesised spine joint is not judged); the skeptic's three swaps fail — the
  forearm ↔ hand swap is run through a copy of prepare's A → T, so its arm
  directions pass by construction, as Doom's did, and it fails on the proportion
  and the flesh; a thigh ↔ calf swap and a limb link of no length fail; and the
  ends are judged by half-space. The net-log reader now reads cache keys (a
  `www.google.com` memory-cache entry is flagged), and a profile reader case
  finds a planted cache entry and a planted copy of a model, and skips the net
  log. **A prepare-and-check case on boxes**: the box on two bones alone cannot
  be prepared (prepare needs the fourteen core joints), so the figure of boxes'
  two-bone arms are the A-posed arm — 45° below the horizontal, each box now four
  rings, each limb box blending to its child along a curve, every vertex's index
  written into its `u`. After `prepare --budget 600` the body is decimated (its
  792 triangles cut); every vertex's joints agree on where it rests to 1e-4 m
  (the inverse bind matrices rewritten from the new pose); the hands' vertices
  sit level with the shoulders (T; at 45° they were 0.4 m below); and **every
  surviving vertex carries exactly the weights it had in the download**, traced
  by its `u`, to 0.01 (8-bit weights after meshopt). The end-to-end case now
  asserts the limb lines on the right map, that the closing line no longer says
  "takes our clip set", and a third wrong map — the left forearm ↔ hand — failing
  on its flesh and its proportion, with prepare's warning.
  **Negative controls**, each a one-line mutation of a tool, run and restored
  (`var/personal-tier/fix3/test-mutants.sh`): one inverse bind matrix 1 cm off
  its joint — "at rest a vertex's joints disagree by 1.00e-2 m"; decimation
  handing each survivor its neighbour's weights — "vertex 9 (source 19): pelvis
  0 ≠ 1"; the limb check's failures not counted — "the left forearm and hand
  swapped: check passed it".
- **§5** now says the rotation equality is by construction and is not a
  measurement of the map, and points here.
- **The preview browser.** Its flags already carried everything the round asked
  for — `--disable-background-networking`, `--disable-component-update`,
  `--disable-sync`, `--no-first-run`, `Translate` and `OptimizationHints` in
  `--disable-features` — and a fresh profile each run. What was not measured was
  the HTTP cache itself. Measured now, from the net log's cache events: with every
  one of those flags on, **the cache keyed a `www.google.com` entry** for the
  omnibox's AI-mode eligibility request (`/async/folae`), which the resolver had
  refused — a synthetic probe with no model in it, run with exactly the round's
  flag list, showed the same (`var/personal-tier/fix3/cacheprobe/`). Of three
  candidate features, `AimServerRequestOnStartupEnabled` is the one whose
  disabling stops it; it is added. Doom's run now reads: **12 cache entries, all
  for 127.0.0.1**; 12 requests to 127.0.0.1; `accounts.google.com` ×2 tried and
  refused by the resolver (it keys no cache entry); 0 DNS queries, 0 TCP
  connections and 0 bytes beyond the loopback. The profile is also read before it
  is deleted — 142 files, 7.92 MB, **no HTTP cache entry file left and no file
  holding any of three 64-byte cuts of `model.glb`**. Two live controls, each a
  one-line edit of `check.mjs`, restored afterwards
  (`var/personal-tier/fix3/preview-mutants.sh`): with the AI-mode feature left
  on, exit 1 — "the browser's HTTP cache keyed an entry for a host beyond the
  loopback: www.google.com" (14 entries, `www.google.com` ×2); with a browser that
  caches (no `--incognito`, a real disk cache, `max-age` answers), exit 1 — "the
  browser's profile kept a copy of model.glb:
  `Default/Cache/Cache_Data/c35c3e8e07ab5b06_0`" (12 entry files left). **The
  profile stays in the slug's folder**, not under `var/` as the round proposed:
  D192 moved it out of `var/` because a profile there had kept a copy of the
  model, and the slug's folder keeps whatever the browser writes beside the model
  it came from (D193's rejected alternatives).

**What the other downloads showed** (calibration, not this lane's to fix; PLAN.md
follow-up 21): Peggy Carter (Mixamo, 19/22 — `spine_03` and the balls
synthesised) and the MCU Wasp (the same) fail D192's `spine_03 → clavicle`
(92°, 78°) and Peggy a foot facing backwards; both pass D193. The older Wasp (a
mesh posed on a T skeleton) fails a foot and, under D193, both forearms' flesh
(−0.82, −0.40): its arms are not where its bones are. Coulson (Character
Creator) fails the sides everywhere and, under D193, two leg links (127°, 125°),
an upper arm and forearm at one point, and two ends at attack 0.5 — its rest pose
read back as 85° / −57°. Doom v2's rig matched no convention (it needs a
`bones.json`).

**The rebase onto `f2c934d`.** Four files conflicted, in both commits:
`CLAUDE.md` (resolved to `main`'s, the lane's text moved as below),
`DECISIONS.md` (D190–D192 placed between D183 and D200, by number),
`PLAN.md` (this lane's section after the docs block's) and `tools/README.md`
(`main`'s paragraph, with the personal modules' sentence). Then, in this pass,
**the move**: the hard-rule-8 paragraph (*A personal model is a statement about
what a card is, too*) into the root file's hard rule 8; the section *The personal
tier — the conventions D190–D193 added* into `tools/CLAUDE.md`, with a pointer
in the root's *Where the rules live* and a row in its docs table; and
`docs/claude-md-rules.txt` regenerated with `CLAUDE_MD_RULES_WRITE=1` — 18
entries added, none removed (the file's order follows the files'), and every
moved rule appears exactly once across the five files. **The *Commits, branches
and merges* bullet** said personal assets are recorded in
`tools/assets-manifest.json` as `committable: false`; it now points at D190 and
the guide, with a dated note saying what it used to say and why D190 rejected
it. README's NON-GOALS bullet, D201's rule 6 and PLAN.md's *Tier 3 — a note, not
a plan* said the same, and each carries the same kind of dated note (D193 says
why D190 governs). PLAN.md's follow-ups 18 and 19 are closed; *Open now* indexes
this lane's open ones.

**Gates, fix pass 3** (the tree as committed):

- `./bridge/build.sh`: OK, 4.4 s.
- `npm --prefix web test`: **1,027 / 1,027 pass** under `node --test` (28 of them
  `personal-tier`) and vitest **121 (8 files)**.
- `npm --prefix web run build`: OK; `web/dist` holds no `personal/models`,
  `doctor_doom`, `model.glb` or `preview-profile`.
- `rm -rf bridge/out && GATE_JOBS=4 WSPORT=9050 ./tools/check-all.sh`, step 10
  on ports 9050–9056: **`check-all OK`, 262.4 s** (4 m 22.6 s by `time`), 48 jobs
  summing to 1,001.2 s, at a load average of 7.5–12.0
  (`var/check-all-personal-tier-merge.log`, run `20260928-220226-2764053`).
  Inside it, `node --test` ran **1,037 / 1,029 pass / 0 fail / 8 skipped** and
  vitest **121 (8 files)**. This section, the PLAN.md gate line and the
  `README.md`, `DECISIONS.md` and PLAN.md notes on `committable: false` were
  written during and after the gate; no test reads those files.
- `~/forge` and `~/.forge`, fingerprinted before the first command and after
  the gate (the jars' sha256, `~/forge`'s top level, and every `~/.forge` file's
  path, size, time and contents): **unchanged** (`var/personal-tier/fix3/forge-before.txt` =
  `forge-after.txt`). The user's zip is still sha256 `92ea148e…42741791`.
- Outside the repo, `find -newer` over `~/snap`, `~/.config`, `~/.cache`,
  `~/.local`, `~/.pki` and `~/code` from a marker touched before the first
  command: the snap Chromium launcher's two paths of §14 (`Crash Reports/settings.dat`
  and the `ibus/bus` link, rewritten at the last preview run's start), and one
  NVIDIA GL shader-cache file under `~/snap/chromium/common/.cache/nvidia/`
  rewritten at 21:51:39, when no Chromium of this pass was running (the probes
  ended at 21:46, the next preview run started at 21:54) and another lane's
  worktree was active; the rest is the desktop's and the Claude app's own state.
- Committed on `personal-tier`: `git merge-base --is-ancestor f2c934d HEAD`
  holds, the tree is clean, and `git status --ignored` shows `personal/` ignored;
  the commit adds no file under it.

---

## The personal tier, phase 2 — the loader, the other seven models, the workshop (2026-09-28)

Worked in the worktree `/home/justin-a/code/mtg-table-t2p2` on branch
`personal-tier-2`, from `main` at `096c952`. Decisions **D194** (the pipeline's
phase 2: the baked clip set, the paint step, `--joints`, the verdict file),
**D195** (the loader: the dev-server index, THE lookup, the dressed pose, the
seat's duelist, the budget) and **D196** (own colours and sibling materials; the
workshop's badge, toggle and inspect view; the catalog's engine facts), in the
lane's reserved range D194–D199. **Nothing below is a picture of a model**, and
nothing under `personal/` is committed: the pictures are under the worktree's
gitignored `var/personal2/pictures/`, the logs under `var/personal2/logs/`.

### 16. The eight downloads through the pipeline

Every model was imported from the user's download already in its folder
(sha256 of every download the same before and after:
`var/personal2/downloads-before.sha256`), then prepared and checked with the
commands in `var/personal2/run-all.sh` (22 s for all eight, previews included).

**The first question D194 answers: does `figures.glb`'s clip set bind a prepared
model directly?** The rotations would: prepare builds every skeleton in the
`agent`'s bind rotations, and Doom's local rotations equal the agent's to
0.03°. The pelvis would not: the agent's clips carry an ABSOLUTE hip track
(the agent's rest pelvis sits at local 0.949 m, and its idle holds it at
0.908 m, 8 cm forward) while Doom's rest pelvis is at 1.008 m — a figure bound
to the agent's clips would stand 10 cm into the table. So prepare now BAKES the
twelve clips into `model.glb` through `retarget.mjs` (which scales the hip by the
two hip heights), and the arena binds a personal model's own animations: no
runtime retarget. `check.mjs` step 2c holds every baked clip to the retarget it
runs — worst joint 0.72°, pelvis 0.3–0.7 mm, on all eight.

| slug | rig | what it needed | triangles (after) | paints | check |
|---|---|---|---|---|---|
| `doctor-doom` | Auto-Rig Pro, auto 22/22 | nothing new (re-prepared: clips baked, paint step) | 17,473 → **5,996** | 2 (the tunic's UVs wrap to 1.87) | **pass** — 22/22 weight, 24/24 sides, 13/13 links, 4/4 limbs, 8/8 flesh, 5/5 ends; cloak follows the spine |
| `hulk` | Mixamo, auto 22/22 | the WELD: 41,060 vertices for 12,292 positions (every triangle its own normals) stopped meshopt at 28,469; welded on position + UV, 5,993 | 29,189 → **5,993** | 1 | **pass** — 22/22, 24/24, 13/13, 4/4, 8/8, 5/5 |
| `nick-fury-spymaster` | Mixamo, auto 22/22 | nothing | 15,465 → **6,000** | 1 | **pass** — 20/22 weight (two joints the agent weights carry none here: warnings), 21/21 sides, 13/13, 4/4, 8/8, 5/5 |
| `peggy-carter-secret-agent` | a Contest-of-Champions rig (Mixamo-like, 19/22) | `bones.json` (Spine1 is `spine_03`, `Toes` the balls), `--joints bind` (the rest pose is 1.72 units off the bind: phase 1 read the vertices at rest and the joints at bind — the "backwards foot"), `--drop group_0` (an unskinned 510-triangle shield plane) | 18,419 → **5,995** | 1 (a 3-tile atlas) | **pass** — 21/22, 24/24, 12/12, 4/4, 8/8, 5/5 |
| `wasp-shrinking-savior-mcu` | the same rig | `bones.json` (the same fix: `spine_03 → clavicle` was 78°) | 13,798 → **5,996** | 1 (a 2-tile atlas) | **pass** — 21/22, 24/24, 12/12, 4/4, 8/8, 5/5 — **active** for *Wasp, Shrinking Savior* |
| `agent-phil-coulson` | Character Creator, auto 22/22 | `--joints rest` (at the bind every side read swapped and the arms and legs folded — its bind matrices read back 88.8° / −75.6°; at rest it is a 30° A), spec/gloss read as base colour, `--drop` for the tongue, teeth, tear-lines, eye occlusion, corneas, lashes and the body and leg skin under the clothes, `--budget 8000` | 92,719 → **7,992** | 1 (a 12-tile 2048 px atlas, cutout for the hair) | **pass** — 22/22, 24/24, 13/13, 4/4, 8/8, 5/5 |
| `wasp-shrinking-savior` | Mixamo, auto 22/22 | `--joints bind` (rest spread 363 units: at the bind its forearms' flesh is ahead of the joints again), `--drop` the base plane and the shadow disc | 12,273 → **5,992** | 1 (a 5-tile atlas) | **pass** — **disabled**: its jacket (`Ropa001`, 7,172 triangles) is an UNSKINNED mesh modelled in the hands-on-hips pose; skinned by height it stays akimbo while the arms move. Blender work. |
| `doctor-doom-v2` | 3ds Max Biped (`Bip001 …`), no convention | `bones.json` (the Biped joints, the forearm's twist to the forearm, the sixteen cape bones to `spine_03`) | 115,886 → **5,991** (a 79,579-triangle unskinned part decimated to a fraction) | 1 (a 7-tile atlas) | **pass** — **disabled**: it reads worse than `doctor-doom` (the cape rides the chest rigidly; the unskinned part is skinned by height) and `doctor-doom` dresses the card and the seat |

So phase 1's calibration failures (§15) were three different things: Peggy's
and the MCU Wasp's `spine_03 → clavicle` was a two-spine rig mapped onto three
(a `bones.json`); Peggy's backwards foot and the fan Wasp's folded forearms were
the vertices and the joints read in two different poses (`--joints`); Coulson's
swapped sides were its bind matrices (`--joints rest`). All eight now pass
`check.mjs`. Each folder has a `check.json` naming the `model.glb` it judged.

**The paint step** (D194) made every model one draw call but Doom (two). The
atlases: 512 px tiles with an 8 px copied-edge gutter; the tolerance for "one
unit tile" is 1% (Coulson's suit reaches v 1.0005 and first went to a primitive
of its own). Every normal map and tangent is dropped: the arena draws none.
Doom's `model.glb` went from 2,339,352 to 1,355,636 bytes (the normal maps out,
the twelve clips in).

### 17. The loader, the arena and the workshop

**The route** (`web/src/personal/devRoute.ts`, D195). At the dev server's start
it printed:

```
personal tier: 6 active model(s), 2 skipped (dev server only, D190)
  active   agent-phil-coulson: Agent Phil Coulson — 7992 triangles, 1 paint(s)
  active   doctor-doom: Doctor Doom, seat opp — 5996 triangles, 2 paint(s)
  active   hulk: Hulk, Brutal Brawler, Hulk, Strongest There Is, Hulk, Gamma Goliath — 5993 triangles, 1 paint(s)
  active   nick-fury-spymaster: Nick Fury, Spymaster — 6000 triangles, 1 paint(s)
  active   peggy-carter-secret-agent: Peggy Carter, Secret Agent — 5995 triangles, 1 paint(s)
  active   wasp-shrinking-savior-mcu: Wasp, Shrinking Savior — 5996 triangles, 1 paint(s)
  skipped  doctor-doom-v2: disabled: passes check.mjs, but … it reads worse than doctor-doom …
  skipped  wasp-shrinking-savior: disabled: its jacket (Ropa001, 7,172 triangles) is an unskinned mesh …
```

Doom's manifest names the seat by its look (`--seat villain`), read as `opp`.

**In the arena** (`?replay=games/g1.jsonl#arena`, dev server, the GTX 1080):
at transport index 355 the page fetched the index and three models — Doom (the
villain seat), Peggy and the MCU Wasp (face-up cards on the table) — and two
figure rigs carried the paint define with opaque ids (`p4`, `p5`); every other
rig was the CC0 body. The villain duelist stands in Doom's own colours under the
comic look — green hood, gold clasps, steel lifted to blue by the look's "black
is blue" — and as a green-tinted hologram of the model's values under
`?look=holo`. `?personal=0` draws the CC0 villain and figures at the same frame.

**The corpus sweep** (`personal.test.ts`, hard rule 8): over 3,679 frames, each
three ways — as recorded; HOSTILE (every back and stub given a real name, every
third face-up creature or stack card turned face down with one, and one creature
a frame given the face-down empty name) with its own poses; and the hostile
placements under the PLAIN poses, which puts a named, modelled pose on a back or
a stub — THE lookup asked the overlay about 13,941 face-up names and never about
a concealed one; 6,225 anonymous figures and 3,164 named poses on a back or a
stub were never asked about; the same loop with the gates taken out asked about
13,119 concealed names (the negative control). Each gate was removed from
`personal.ts` by hand, one at a time, and restored: without the placement gate
the sweep fails on the third pairing ("the overlay was asked about a concealed
name"), without the pose gate on the second ("an anonymous or modelless figure
was dressed"), and the unit case fails both times.

**The workshop** (`#workshop`): a *personal* badge on the eight cards the six
active models dress, the pedestal dressed as the arena dresses, a *personal / repo*
toggle, and the INSPECT view — Doom in front of his card's art box, the frame
and text floating beside it, the art window cut out. The catalog could not stand
Doom or a Hulk on the pedestal at all: no committed recording ever showed them
face up, so they were `missing`. With D196's engine facts 94 deck cards gained
their facts from Forge's own scripts (`Legendary Creature - Human Scientist
Villain`, `{4}{B}{B}`, 3/3 for Doom); 24 stay missing (Reality Fracture cards
the pinned engine lacks, D109). Doom's clips play on the pedestal: the held
stances (ready, the kneel, attacking, blocking) and `hit` and `die` caught
mid-clip with the queue paused.

**The pictures** (`var/personal2/pictures/`, gitignored — never committed):

- `arena-g1-355-{comic,holo}-{personal,repo}.png` — Doom as the villain duelist at
  the table view, and the CC0 villain, under both looks;
- `workshop-<card>-{personal,repo}.png` for Doctor Doom, Nick Fury, Agent Phil
  Coulson, Peggy Carter, Wasp, Hulk, Gamma Goliath and Hulk, Brutal Brawler — each
  on its card at 1× from the front, and the CC0 figure it replaces;
- `workshop-<card>-inspect.png` for the same seven, and
  `workshop-doctor-doom-inspect-holo.png`;
- `workshop-doctor-doom-stance-{tapped,attacking,blocking}.png` and
  `workshop-doctor-doom-clip-{hit,die}.png`.

**The budget** (D195, `tools/arena-bench.mjs --index 316` against the DEV server,
since the route is dev-only; three interleaved pairs each, `?personal=0` against
the overlay on — Doom the villain, Peggy and the MCU Wasp dressed):

| | draw calls | triangles | p50 | p95 | max |
|---|---|---|---|---|---|
| GTX 1080, bloom off, CC0 | 86 | 26,315 | 0.50 | 0.60 | 10.9–16.5 |
| GTX 1080, bloom off, personal | 81 | 38,551 | 0.40 | 0.60 | 10.7–11.0 |
| GTX 1080, bloom on, CC0 / personal | — | — | 0.50 / 0.50 | 1.70 / 1.50 | 13.9 / 17.5 |
| SwiftShader (dpr 0.6), CC0 | 88–90 | 29,517–29,521 | 16.2–16.6 | 33.9–34.5 | 35.8–57.1 |
| SwiftShader (dpr 0.6), personal | 85 | 41,537–41,661 | 19.0 | 34.8–35.1 | 49.8–66.7 |

Three personal models add 12,236 triangles and TAKE five draw calls (a dressed
figure sheds its props). On the GPU nothing moves. On SwiftShader the p50 rises
about 2.6 ms and the p95 about 1 ms — the CC0 table already fails §9.4's p95
there on this build and load (load average 5–8). Report 13 §8.2's 30,000-triangle
line has no headroom at @316, so the first personal model crosses it: the caps
(`PERSONAL_TRI_CAP` 8,000, `PERSONAL_CALL_CAP` 2, `PERSONAL_MAX_FIGURES` 4 plus
the two duelists) are this machine's, where the tier runs. arena-bench's own
SwiftShader flags start the GPU process again on this Chromium (§7's note).
The bench's browser profile held no copy of any personal model (three 64-byte
cuts of each `model.glb`, searched in its 621 files).

**The build carries none of it.** `npm --prefix web run build`: the 2D entry
chunk is 90.40 kB gzip and names no three; no built chunk contains `personal/`
or any slug of this machine's folder (`personal.test.ts` asserts it over
`web/dist`). The one source map that names the route is the arena scene's: a map
carries its sources' text, and `scene/personalModels.ts`'s DEV branch and
comments are in it — the code that runs has the branch folded away. No map
names a slug.

**The tests.** `npm --prefix web test`: **1,040 / 1,040 pass** under
`node --test` (1,027 on `main` + 13: `personal.test.ts`'s eight, a
`figure-material` case, two `workshop` cases, a `personal-tier` case and a
liveness clause) and vitest **121 (8 files)**. `personal-tier.test.ts`'s
end-to-end case now also asserts the twelve baked clips, step 2c's line, and
`check.json` (passed on the right map, failed on each wrong one); its new case
runs the paint step on a textured figure of boxes — two tileable parts share an
atlas, a wrapping one keeps its texture, every part's vertex range recorded,
`--disabled` with its reason.

**Gates, phase 2** (the tree as committed):

- `./bridge/build.sh`: OK (no bridge change).
- `npm --prefix web run build`: OK; `npm --prefix web test`: 1,040 / 1,040 and
  vitest 121 (8 files), above.
- `rm -rf bridge/out && GATE_JOBS=4 WSPORT=9070 ./tools/check-all.sh`:
  **`check-all OK`, 241.7 s**, 48 jobs summing to 935.7 s, load average
  0.4–7.5 (`var/check-all-personal2-p1.log`, run `20260928-233820-3347527`);
  inside it `node --test` **1,050 / 1,042 pass / 0 fail / 8 skipped** and vitest
  **121 (8 files)**. Again at `WSPORT=9080`: **`check-all OK`, 241.3 s**, 48 jobs
  summing to 934.1 s, load average 5.9–9.4 (`var/check-all-personal2-p2.log`,
  run `20260928-234231-3420654`), the same counts. The lane added no step and no
  job.
- `~/forge` and `~/.forge`: **unchanged**. The four `~/forge` jars' sha1 are the
  ones read before the lane's first command (the desktop jar's sha256
  `3c0a7c38…8e5dd9`), no file under either tree is newer than 22:00, before the
  lane began, and every path, size and time under `~/.forge` is the listing taken
  before the first command. Every download's sha256 is the same before and after.


### 18. Fix pass 1 — the verifier's round 1 (2026-09-29, D197, D198)

The verifier passed the hard-rule-8 sweep, the route, the build and every
model's check, and found two majors and three minors. All five are fixed; none
was skipped. Logs under the worktree's gitignored `var/personal2/fix1/`.

**Major 1 — the triangle budget (D197).** The phase-2 caps bounded each model
(8,000 triangles, 2 paints) and the count (4 creatures), not their product: six
models at 8,000 is about 66,000 triangles on the table, where §17 had benched
three at about 6,000, and `arena-bench` never checked triangles at all. Now:

- `arena/perf.ts`'s **`PERSONAL_TABLE_TRIS` = 36,000**, the most personal
  triangles on the table at once, is a sum `personalChoicesOf` spends — the
  seats' models first (`seatTriangles`, each seat its own instance), then the
  creatures in placement order; one that would cross it keeps its CC0 figure.
  Report 13 §8.2's 30,000 stays the CC0 table's line; the tier's is added to it.
- `tools/arena-bench.mjs` fails a frame over §8.2's line (read from
  `tools/assets-manifest.json`'s `budget.triangles`), and `--personal` moves it to
  30,000 + `PERSONAL_TABLE_TRIS`.
- **The worst case, benched.** A scratch tier under `var/personal2/fix1/worst/`
  (deleted after; `MTG_TABLE_PERSONAL_DIR`, new) held seven copies of Doom's
  prepared model — 5,996 triangles and two paints each, the worst in triangles
  and in calls at once — dressing both seats and five face-up cards on the table
  at `g1`@316 (Aerial Doombot, Wasp, Robot Token, Peggy Carter, Soldier Token).
  The lookup dressed the two seats and four creatures (35,976 of 36,000; the
  fifth stopped by the count cap): twelve painted skinned meshes, counted in the
  scene. `node tools/arena-bench.mjs --url "…/?replay=games/g1.jsonl&personal=1#arena"
  --index 316 --no-bloom --gpu gl|swiftshader --personal`, interleaved with
  `personal=0`, two pairs each, load average 1.6–4.5:

| | draw calls | triangles | p50 | p95 | max |
|---|---|---|---|---|---|
| GTX 1080, CC0 | 86 | 26,315 | 0.50 | 0.60 | 10.5–12.4 |
| GTX 1080, the worst case | 90 | 50,225 | 0.40–0.50 | 0.60 | 11.0–13.0 |
| SwiftShader (dpr 0.6), CC0 | 88 | 29,517 | 16.3–16.8 | 33.9–34.6 | 35.7–82.7 |
| SwiftShader (dpr 0.6), the worst case | 95 | 53,407 | 20.5–20.7 | 27.2–27.6 | 50.6–53.4 |

  The GPU does not notice. SwiftShader's median is about 4 ms slower (its p95
  reads lower, the bimodal floor of a software rasteriser); it fails §9.4 with or
  without the tier, as before. Both worst-case runs pass the bench's new triangle
  line (66,000) and §9.1's 120 calls; on SwiftShader the worst case passes §8.2's
  90-call line by five (a two-paint model is one call more than the body it
  replaces — follow-up 33). Logs: `var/personal2/fix1/bench/`.

**Major 2 — Doom's own colours (D198).** The verifier read Doom's tunic and cloak
as navy and his armour as lavender-blue. Measured on his prepared paint,
area-weighted over the surface: **p10 0, p50 0.0066, p90 0.0267** in linear
luminance — 85% of the surface under 0.02, 99% under the comic look's `blackAt`
(0.045) — so "black is blue" mixed nearly all of him toward navy, and even with
it gone the texture is far too dark to read unlit (it was authored for a lit PBR
renderer). Two fixes:

- **The look** (`figureMaterial.ts`'s `comicPaintOwn`, `COMIC.ownFloor` 0.02): an
  own texel under `blackAt` is lifted in value with its OWN hue, from the floor up
  to `blackAt`, in order; a texel with no hue lifts to a neutral. The palette's
  rule is unchanged.
- **The file** (`prepare.mjs`'s exposure step, `--exposure auto|off|<gain>`):
  prepare measures the painted surface and, when its 90th percentile is under
  0.2, multiplies every paint by one gain in linear light (at most ×8, each
  texel's hue held; `lib.mjs`'s `exposeTexels`). Recorded in `paint.exposure` and
  printed by the dev server at start:

| model | surface p10 / p50 / p90 before | gain | p90 after |
|---|---|---|---|
| `doctor-doom` | 0 / 0.0066 / 0.0267 | **×7.491** (16,602 texels held under white) | 0.2006 |
| `peggy-carter-secret-agent` | 0.0133 / 0.0247 / 0.1485 | ×1.347 | 0.1999 |
| `doctor-doom-v2` (disabled) | 0.0319 / 0.087 / 0.1164 | ×1.718 | 0.1999 |
| `hulk` | 0.0561 / 0.1992 / 0.2461 | kept | — |
| `nick-fury-spymaster` | 0.0103 / 0.0137 / 0.2051 | kept | — |
| `agent-phil-coulson` | 0 / 0 / 0.4969 | kept | — |
| `wasp-shrinking-savior-mcu` | 0.0071 / 0.0334 / 0.4473 | kept | — |
| `wasp-shrinking-savior` (disabled) | 0 / 0.0033 / 0.8046 | kept | — |

  All eight were prepared and checked again (`var/personal2/fix1/run-all.sh`,
  23 s); every `check.mjs` ends in OK on its new `model.glb`, Doom's with the
  same numbers as before (22/22 weight, 13/13 links, 4/4 limbs, 8/8 flesh, the
  twelve baked clips 0.72°, pelvis 0.3 mm). A scratch run at ×5.6 read the same
  as ×7.49 at 1×, so the automatic target stayed.

**What it looks like now** (`var/personal2/pictures/`, all 31 re-taken; the
phase-2 set moved to `var/personal2/pictures-phase2-before-fix1/` for the
before/after; side-by-side crops in `var/personal2/fix1/review/`): Doom reads a
green hood, tunic and cloak over grey steel with gold clasps — on his card, in the
inspect view against the card's own green-and-silver Doom, kneeling, and as the
villain duelist at the table view; under `?look=holo` he is the same green-tinted
hologram as before. The others moved the same way: Coulson's and Fury's suits
read charcoal instead of navy, Peggy's shoes brown, the Hulks' trousers purple.
His mask still hides under the bowed hood from the front (follow-up 26).

**The minors.**

- **The build test's race.** `tools/check-all.sh`'s `13c-node` now depends on
  `13a-build` (`personal.test.ts` greps the `web/dist` that job writes), and
  `13a-build` moved up the launch order, beside vitest, so the wait costs
  nothing. The test's skip message says so.
- **The route's caps.** `buildPersonalIndex` applies `PERSONAL_TRI_CAP` and
  `PERSONAL_CALL_CAP` before a model can claim a card or a seat. The verifier's
  own case, Peggy's manifest at 9,001 triangles, now prints
  `skipped  peggy-over: 9001 triangles, over PERSONAL_TRI_CAP (8000) — never
  loaded; prepare it again with a smaller --budget`
  (`var/personal2/fix1/logs/overcap-index.txt`).
- **The workshop's clip panel** reads *Clips — your model (the personal tier: our
  clips, baked into it)* while the pedestal is dressed and *the scientist body*
  with the toggle on *repo*.

**The start lines now** (the real `personal/`):

```
personal tier: 6 active model(s), 2 skipped (dev server only, D190)
  active   agent-phil-coulson: Agent Phil Coulson — 7992 triangles, 1 paint(s)
  active   doctor-doom: Doctor Doom, seat opp — 5996 triangles, 2 paint(s), exposed ×7.491
  active   hulk: Hulk, Brutal Brawler, Hulk, Strongest There Is, Hulk, Gamma Goliath — 5993 triangles, 1 paint(s)
  active   nick-fury-spymaster: Nick Fury, Spymaster — 6000 triangles, 1 paint(s)
  active   peggy-carter-secret-agent: Peggy Carter, Secret Agent — 5995 triangles, 1 paint(s), exposed ×1.347
  active   wasp-shrinking-savior-mcu: Wasp, Shrinking Savior — 5996 triangles, 1 paint(s)
  skipped  doctor-doom-v2: disabled: …
  skipped  wasp-shrinking-savior: disabled: …
```

**The controls, re-run** (`var/personal2/fix1/logs/controls.txt`), each against
the file restored byte for byte after: with the table sum taken out of the
lookup, the new budget case fails; with the placement gate taken out, the corpus
sweep fails ("the overlay was asked about a concealed name") and the unit case
with it; with the pose gate taken out, the sweep fails ("an anonymous or
modelless figure was dressed"); with `comicPaintOwn` mixing toward `uBlack`
again, or an own paint sent through `comicPaint` (phase 2's shader), the
figure-material test fails.

**The tests.** `npm --prefix web test`: **1,044 / 1,044** under `node --test`
(1,040 + a budget case in `personal.test.ts`, the own-paint case in
`figure-material.test.ts`, and two exposure cases in `personal-tier.test.ts` — the
helpers, and the step on a dark figure of boxes: gain > 1.5, p90 lifted to the
target, `--exposure off` identical, a bad gain refused), vitest **121 (8 files)**.
The index case gained two over-cap models and the exposure lines, and
`look.test.ts` holds `ownFloor` under `blackAt` and near the black-is-blue value.
`npm --prefix web run build`: the 2D entry chunk 90.40 kB gzip, no `three`; no
JS chunk names `personal/`, a route, `MTG_TABLE_PERSONAL` or any slug, and the
only `.glb` is `models/figures.glb`.

**Gates, fix pass 1** (the tree as committed):

- `./bridge/build.sh`: OK (no bridge change).
- `npm --prefix web run build`: OK; `npm --prefix web test`: 1,044 / 1,044 and
  vitest 121 (8 files), above.
- `rm -rf bridge/out && GATE_JOBS=4 WSPORT=9070 ./tools/check-all.sh`:
  **`check-all OK`, 241.5 s**, 48 jobs summing to 931.4 s, load average
  0.8–4.1 (`var/check-all-personal2-fix1.log`, run `20260929-003441-3648774`);
  inside it `node --test` **1,054 / 1,046 pass / 0 fail / 8 skipped** and vitest
  **121 (8 files)**. `13a-build` ran 8.3–17.5 s and `13c-node` 231.9–241.5 s: the
  node job read the finished build, and the wall time did not move (241.7 and
  241.3 s in phase 2).
- `~/forge` and `~/.forge`: **unchanged** — the four `~/forge` jars' sha256
  (the desktop jar's `3c0a7c38…8e5dd9`), the `~/forge` tree's path, size and
  time listing, and the sha256 of every file under `~/.forge` are the ones taken
  before the fix pass's first command (`var/personal2/fix1/`); every download's
  sha256 too.

### 19. Onto the status layer — the rebase onto `2bd8514` (2026-09-29)

`main` gained the status layer (D210–D212, amendment M49) after this branch left
`096c952`: a strip over every creature — keyword icons, a bar, pips and marks —
laid out by `figures/status.ts`, drawn by `scene/status.ts` as one instanced mesh
committed by `FigureLayer` and bound from `DiscField.bind`, and a turn-order bar.
Both branch commits were rebased onto `2bd8514` (`15fdf79` → `739bb76`, `85ec6b4`
→ `76478a9`); logs under the worktree's gitignored `var/personal2/merge/`.

**The conflicts, and how each kept both behaviours.** Phase 2's commit met seven,
its fix pass two.

- `web/src/arena/Arena.tsx`: `FigureLayer` takes the status layer's `status` AND
  the tier's `personal`; the personal block (overlay, THE lookup, the loaded
  models, the dressed poses) comes first, and the strips are laid out after it
  from the DRESSED poses — `statusLayout(placed, figures)`, `figures` being
  `dressPoses(basePoses, …)`.
- `web/src/arena/scene/FigureLayer.tsx`: both props, `modelOf` (the one
  model-source choice) and the `StatusField` (built, primed, committed, handed to
  `DiscField.setStatus`) side by side; nothing else moved.
- `web/src/workshop/Pedestal.tsx`: the dressed poses as `Arena.tsx` dresses, the
  strips from them, `FigureLayer` with both props, and the inspect view's
  `InspectStage` kept; the status rehearsal and the personal toggle are both live.
- `web/src/arena/CLAUDE.md`: both sections — the status layer's, then the
  personal tier's (retitled D194–D198 by the fix pass); convention 3 says the strip
  rides the dressed pose, convention 5 carries this section's bench.
- `CLAUDE.md`, `PLAN.md`, `docs/claude-md-rules.txt`: both lanes' rows and
  entries. `main`'s merge had left `CLAUDE.md` two `DECISIONS.md` rows and
  `PLAN.md` two *Open now* header paragraphs (the second stale); each is one now,
  and the header is recounted from the index — 30 lists, 373 items, 278 open (254
  open, 18 partly, 3 not reproduced, 2 standing, 1 accepted), 95 closed. Phase 2
  and its fix pass stay inside *The personal tier*, before *The status layer*. The
  manifest was regenerated (`CLAUDE_MD_RULES_WRITE=1`), and `claude-md.test.ts`
  passes with every rule once.

**The one join, and its test.** A dressed figure's height is refitted to its
model (D65 strict), so the strip reads the dressed pose and stands over the
model's own head; `strippable` gates on the pose and the placement, never on the
model worn. `personal.test.ts` gained a case: over the corpus (3,679 frames, plain
and hostile), **9,985** dressed figures carry a strip, every one at
`position + dressed height + STATUS_LIFT` and all 9,985 over a refitted height;
**1,808** backs and stubs dressed ON PURPOSE (the lookup's gates skipped) draw no
strip; and a source check holds both callers to lay the strips out from the
dressed poses, declared first. With `strippable`'s placement gate taken out, the
case fails (*a strip over a concealed card #30*, `games/disjoint.jsonl`); the file
was restored byte for byte.

**The sweeps on the merged tree.** Hard rule 8 for the tier, three pairings,
hostile included: 3,679 frames, 13,941 face-up names looked up and 13,941 figures
dressed, 6,225 anonymous figures and 3,164 named poses on a back or a stub never
asked about, and the ungated control asking about 13,119 concealed names. The
status layer's: 10,763 strips, none over any of 1,179 concealed creature
instances; hostile (every card handed keywords), 10,763 keyworded strips all face
up, where an ungated layout would draw 1,138.

**The builds.** `node tools/build-workshop-catalog.ts`: byte-identical (the
status layer's optional `keywords` fact and phase 2's engine facts meet without a
difference). `./bridge/build.sh`: OK, the five self-tests. `npm --prefix web run
build`: OK — the 2D entry chunk **93.53 kB** gzip with no `three` (the status
layer measured 93.52), `arena-scene` 374.13 kB; no chunk names `personal/`, a
route or any slug (`personal.test.ts`'s `dist` case; a plain grep finds
`hulk` only in the committed deck name `hulk-family.dck`). `npm --prefix web test`:
**1,060 `node --test`** (1,054 pass, 6 skipped) and **vitest 122 (8 files)**.

**The bench** — `g1`@316, `--no-bloom --personal`, against the DEV server on port
5211, `personal=0` and `personal=1` interleaved, two pairs a rasteriser (a third on
SwiftShader for the worst case), load average 0.5–4.0. The real tier is the six
active models; at `g1`@316 THE lookup dresses the villain seat (Doom) and two
creatures, 17,987 personal triangles. The worst case is D197's, rebuilt the same
way: seven copies of Doom's model (5,996 triangles, two paints) in a scratch tier
under `var/personal2/merge/worst/` (`MTG_TABLE_PERSONAL_DIR`, deleted after),
dressing both seats and four creatures.

| | draw calls | triangles | p50 | p95 | max |
|---|---|---|---|---|---|
| GTX 1080, CC0 | 87 | 26,395 | 0.50 | 0.60 | 10.8–14.9 |
| GTX 1080, the real tier | 82 | 38,631 | 0.40 | 0.60 | 10.8–18.1 |
| GTX 1080, the worst case | 91 | 50,305 | 0.40 | 0.60 | 10.5–11.1 |
| SwiftShader (dpr 0.6), CC0 | 89–90 | 29,609–29,611 | 16.4–16.7 | 34.1–34.3 | 34.9–65.7 |
| SwiftShader (dpr 0.6), the real tier | 86 | 41,623–41,747 | 19.2–19.4 | 33.7–34.6 | 48.9–58.1 |
| SwiftShader (dpr 0.6), the worst case | 95 | 53,297–53,421 | 21.1–22.2 | 27.3–30.3 | 50.9–124.6 |

Against the lines: every run is under the bench's triangle line (66,000 with
`--personal`) and §9.1's 120 calls. The strip is the one call it was at its merge:
the CC0 table reads 87 on the GTX 1080 and 89–90 on SwiftShader (86 and 88 in §18;
D212 recorded 91 on SwiftShader, inside the bench's sample drift), and the worst
case 91 on the GTX 1080 (90 in §18). On SwiftShader the worst case reads **95**,
D197's own number: the strip's call is there (11 strips in the census), and the
sampled frame drew one prop kind fewer than §18's (14 against 15) — the bench
samples the table five seconds into a 4× replay, so its board drifts by the
rasteriser's pace. So the merged tree's worst case is D197's 95 on SwiftShader —
five over report 13 §8.2's 90-call line, follow-up 33's — and 91 on the GTX 1080,
one over it; the real tier is under the line on both (82 and 86), because a
dressed figure wears none of our props. SwiftShader fails §9.4 with or without
the tier, as before; the 118–125 ms maxima are the cold table's first three
frames (settle 600 ms). The GPU does not notice either layer.

**The pictures** (`var/personal2/merge/`, gitignored, never committed): the table
view at `g1`@355, comic, Doom as the villain duelist at the table's right and a
strip over every figure (`arena-g1-355-comic-personal-strips.png`); the workshop's
Doom on the pedestal at `1× front` with his strip at rest (a full bar,
`workshop-doctor-doom-personal-strip.png`) and after the *status strip* rehearsal
with back-to-rest off — the sample's four keyword icons, the bar drained by the
damage and a +1/+1 pip (`workshop-doctor-doom-status-strip.png`).

**The gate**, twice from a deleted `bridge/out` at `GATE_JOBS=4`:
`WSPORT=9100` **242.2 s** (48 jobs, 936.9 s summed, load average 2.2–6.3,
`var/check-all-personal2-merge-p1.log`) and `WSPORT=9110` **242.5 s** (936.1 s
summed, 5.8–7.7, `-p2.log`), `check-all OK` both; inside each `node --test`
**1,075 / 1,067 pass / 0 fail / 8 skipped** and vitest **122 (8 files)**.
`~/forge` and `~/.forge`: **unchanged** — the desktop jar's sha256
(`3c0a7c38…8e5dd9`), the `~/forge` tree's path, size and time listing, the
`~/.forge` listing and the sha1 of every file under it, taken before the rebase's
first command and after the second gate.
