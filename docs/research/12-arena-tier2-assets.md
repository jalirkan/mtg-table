# 12 — Arena Tier 2: the asset and tooling landscape

Status: **landscape survey and a recommended stack, 2026-09-13.** Scope: what
Tier 2 of [`docs/ideas/arena-mode.md`](../ideas/arena-mode.md) — *"a small library
of stylised generic models keyed by creature type and colour with idle / attack /
hit / die animations… creatures appear as holograms between them"* — would be
**made of**: models, rigs, animation clips, the tools that convert and compress
them, the VFX that does not need a model, the land tiles, and the licence story
for every one of them.

Inputs: [`docs/ideas/arena-mode.md`](../ideas/arena-mode.md) (the tier definition
and the per-card cue table), [`09-arena-tier1-plan.md`](09-arena-tier1-plan.md)
§5, §6, §7, §9, §12, §13 (the offset model, the cue ladder, the performance
budget, the Tier-1 primitive kit), `PLAN.md` §M7 *"What Tier 1 hands to Tier 2"*,
[`../evidence/m7-arena.md`](../evidence/m7-arena.md), and the arena source as it
stands (`web/src/arena/`).

**This document writes no code and touches nothing outside itself.** It does not
build, does not install, does not start a server, and proposes no edit to any
existing file. Everything it recommends is a decision for a later evening.

---

## Evidence convention

Three kinds of claim, marked throughout:

- **`web:`** — read on a live page today, 2026-09-13, with the URL cited. Every
  licence claim in this document is of this kind. Where a licence is quoted, the
  quote is from the page or from a file downloaded from it.
- **`measured:`** — a number I produced by fetching the actual artefact and
  parsing it (a `.zip` central directory, a `.glb`'s JSON chunk), or by reading
  the installed `node_modules` tree of this repo, or by running a counting script
  over `fixtures/games/*.jsonl`. These are not vendor claims.
- **`inferred:`** — reasoning. Called out every time.

**A note on what could not be measured, stated once.** No renderer was run. Every
performance statement below is arithmetic over measured triangle, draw-call and
byte counts against report 09 §9.1's budget — it is a *budget projection*, not a
frame time. Report 09's own caveat still governs: the dev box has a **GeForce GTX
1080 (8 GB) and an AMD iGPU** (`measured:` `lspci` — `NVIDIA GP104 [GeForce GTX
1080]`, `AMD/ATI Device 13c0`; `nvidia-smi` reports 8,192 MiB), so it is not the
target machine and will flatter any Tier 2 measurement taken on it.

---

## 0. Executive summary — the eleven findings that decide Tier 2

1. **The whole archetype set can be covered by CC0 assets that are legal to
   commit to the public repo.** Kenney (`web:` CC0 on every pack page and in the
   `License.txt` inside every zip), KayKit (`web:` CC0), and 82 of Quaternius's 83
   pack pages (`measured:` below) are CC0 — public domain, redistribution
   explicitly permitted. This is the single most important finding, because it
   means Tier 2's assets do **not** have to live in the same "local only" bucket
   as the Scryfall card art.
2. **Quaternius has begun relicensing.** A new **Quaternius Asset License (QAL)
   v1.0**, "Last updated: 8/28/2026" (`web:`
   <https://quaternius.com/license.html>), forbids redistributing the assets *as
   assets* — §3(a), "regardless of how much the Assets have been modified".
   `measured:` today, **exactly one of 83 pack pages badges QAL** (the newest,
   *Bestiary – Dungeon Monsters Kit*); the other 82 still badge CC0. **Check the
   badge on the pack page on the day you download**, and record it, because QAL §7
   says the version in force when you obtained the asset governs.
3. **Mixamo's clips may be used but may not be committed.** `web:` the Adobe FAQ
   grants royalty-free use of characters and animations for commercial and
   non-commercial projects including video games; the long-standing licensing FAQ
   is blunt about the limit — *"really the only thing you can't do is distribute
   the raw character and animation files"*, with "any type of free distribution of
   character or animation raw files" listed under **NO**. For a public GPL repo
   that puts Mixamo output in the same bucket as Marvel-derived art: **local
   only**. And there is a CC0 substitute that is explicitly Mixamo-rig-compatible
   (finding 4), so this costs us almost nothing.
4. **Quaternius's Universal Animation Library is the Mixamo replacement.** `web:`
   120+ animations (UAL) and 130+ more (UAL 2), "created using a universal
   humanoid rig… **Compatible with other common rigs (Mixamo for example)**",
   FBX + **GLB** + Blend, **CC0**, **15 MB** and **17 MB** for the standard zips.
   A CC0 clip library that retargets onto a Mixamo-shaped skeleton removes the one
   reason Tier 2 needed Mixamo at all.
5. **The cheapest good-looking option is not skinned at all.** `measured:` Kenney's
   *Blocky Characters* `character-a.glb` is **72 triangles**, 6 meshes, **1
   material**, **0 skins** and **27 animation clips** — including `idle`, `walk`,
   `die`, `attack-melee-right`, `attack-kick-right`, `holding-both-shoot`,
   `emote-yes`/`emote-no`. It is a rigid hierarchy animated by node transforms, so
   there is no skinning cost whatsoever, and 21 of them is **1,512 triangles** —
   still inside report 09 §9.1's ≤ 2,000 triangle budget. Its cost is **6 draw
   calls per figure**, which is the line that actually binds.
6. **The board never holds as many creatures as you would fear.** `measured:` over
   all eighteen committed recordings (3,677 `state` frames with a `players` array),
   the battlefield holds at most **21 creatures** (both seats together, in
   `human-sideboard-7.jsonl`), at most **42 permanents** and at most **21 lands**;
   the mean creature count is **3.23** and the 95th percentile is **10**. Tier 2's
   budget is therefore "10 figures typical, 21 worst case", not "a hundred".
7. **Draw calls, not triangles, are the Tier 2 budget.** §9.1 allows ≤ 120 draw
   calls and Tier 1 uses 40. 21 blocky figures at 6 calls each is **126** — over
   budget on its own. 21 Kenney *Mini* characters (skinned, 2 skins each) is **42**.
   21 Quaternius *Man in Suit* (`measured:` **7 materials**, vertex-coloured) is
   **147**. The fix is an offline one: `gltf-transform palette` + `join` merges
   per-colour materials into one palette texture and one mesh.
8. **Two drei helpers have traps that collide with the arena's architecture, and
   both are one line to avoid.** `measured:` `@react-three/drei@9.122.0`'s
   `useAnimations` calls `useFrame((state, delta) => mixer.update(delta))` — it
   registers **its own frame callback per creature**, which breaks §9.2's "one
   `useFrame`, in `CueRunner.tsx`". And `useGLTF(path, true)` sets the Draco
   decoder path to `https://www.gstatic.com/draco/versioned/decoders/1.5.5/`
   (`Gltf.js:8`) — a **network fetch**, which §2.1 rule 1 forbids the arena.
9. **`AnimationMixer.setTime()` is what makes a clip fit the offset model.**
   `measured:` `three/src/animation/AnimationMixer.js:722`. A cue that owns a
   clip's *time* rather than feeding it deltas is skippable (set progress 1 → clip
   end), scrub-safe (`flushAndSnap()` → clip time 0, idle) and interruptible —
   the same four properties §5.1 buys for offsets, for free, by the same trick.
10. **Image-to-3D from card art is a legal dead end for anything committed, and a
    grey area even locally.** `web:` Meshy's own FAQ grants you ownership of your
    generations *"provided that you have used materials that do not violate the
    copyrights of others"*; `web:` the Wizards Fan Content Policy says *"If you
    don't have the rights to use another person's stuff in your Fan Content—don't."*
    A mesh generated from a Marvel card's art is a derivative of that art. It can
    never go in the public repo, and it should be treated exactly as the card
    JPEGs are: fetched or generated locally, gitignored, never shipped.
11. **Luma is out.** `web:` `lumalabs.ai/genie` now redirects to the Luma
    homepage, which mentions 3D **zero** times (`measured:` `innerText` scan). Luma
    ships video and image agents (Ray 3.2) today. It does not belong on the list.

---

## 1. What Tier 2 actually has to cover

The routing already exists: `cues/archetype.ts` maps a `Card` to
`"<primaryType>/<colourId>"` from fields the protocol ships, and §7.3's ladder
resolves per-card → archetype → default. **A model library is keyed by the same
string.** So the shopping list is not "models for 40 cards", it is "a mesh for
each archetype, plus a handful of per-card overrides where the source material
demands one".

From the deck (`decks/pacho-shield.dck`, creature types quoted in the task):

| Archetype key(s) | Deck members | What the figure has to do | Clips needed |
|---|---|---|---|
| `creature/W`, `creature/U` — **human agent / hero** | Peggy Carter, Agent 13, Coulson, Nick Fury, Agents of S.H.I.E.L.D., Quake, Ant-Man, Wasp | stand, lunge at a defender, take a hit, die; a pistol-draw *pose* for Agent 13 (§12.2 says the pose is the point) | idle, attack (melee **and** ranged), hit, die |
| `creature/*` — **robot / drone** | Aerial Doombot | hover, laser-eye idle, jet exhaust on attack | idle(hover), attack/shoot, hit, die |
| `creature/*` — **insect** | Giant-Sized Flying Ant, Ant-Man's Air Force (as a swarm) | hover/flutter, bite, die | fly-idle, bite, hit, die |
| `creature/*` — **scientist** | A.I.M. Scientists, Bold Biochemist | work at a bench, react | idle, work/gesture, hit, die |
| token — **Soldier** | Nick Fury's tokens | the same human rig, plainer | idle, attack, die |
| `land/*` — **terrain** | Plains, Island, Thriving Heath, Thriving Isle | a tile that rises and ripples on tap | none (transform only) |
| duelist avatars | — | stand at either end | idle |

Two per-card beats from §12.2 that Tier 1 could not buy and Tier 2 can:
**Agent 13's pistol-draw pose**, **the Flying Ant's rider silhouette**, the
**A.I.M. lab bench**, and the **Doombot's laser-eye idle**. Everything else on
the cue table is already delivered.

**Note what is *not* on this list: 40 unique meshes.** That is Tier 3. Tier 2 is
seven or eight figures.

---

## 2. Free rigged low-poly packs, verified live today

### 2.1 Quaternius — the biggest CC0 library, and a licence that just changed

`web:` <https://quaternius.com/> · <https://quaternius.com/license.html> ·
<https://quaternius.itch.io/>

**The licence split, measured.** I fetched all 83 pack pages linked from the
front page and read the licence badge on each:

```
total pack pages: 83   ·   badge "CC0": 82   ·   badge "QAL": 1
QAL: bestiarydungeonmonsterskit   (the newest pack)
```

The **Quaternius Asset License (QAL) v1.0** (`web:`, "Last updated: 8/28/2026")
grants a "worldwide, royalty-free, non-exclusive, perpetual license… for personal,
educational, or commercial purposes" with "No attribution required", but §3(a)
forbids redistribution:

> "You may not extract, repackage, sublicense, sell, or otherwise redistribute the
> Assets (in original or modified form) as a standalone asset, asset pack, stock
> file, template, or similar product, whether for free or for payment… This
> restriction applies regardless of how much the Assets have been modified."

**A public git repository containing a QAL `.glb` is a redistribution of the asset
as a file.** `inferred:` a QAL pack therefore belongs in the local-only bucket,
alongside Mixamo and card art. A CC0 pack does not. §7 of QAL is the saving grace:
"the version in effect at the time you obtained the Assets governs", so a pack
downloaded today under a CC0 badge stays CC0 forever — **but record the badge and
the date at download time**, because the badge is the only evidence.

**The packs that matter, all `web:` from the pack page (models · animated ·
formats · licence) and itch (sizes):**

| Pack | Models | Formats | Licence | Standard zip | Covers |
|---|---:|---|---|---:|---|
| **Universal Base Characters** (Aug 2025) | 6 | FBX OBJ Blend **glTF** | CC0 | **122 MB** (Source 600 MB, $19.99) | human agent/hero/scientist — *"Superhero, Regular, and Teen proportions (male and female)… rigged with a Humanoid rig allowing easy retargeting in any engine… Average 13k tris"* |
| **Universal Animation Library** | 1 rig | FBX **GLB** Blend | CC0 | **15 MB** | the clips. *"120+ Animations… Compatible with other common rigs (Mixamo for example)"*; v3.0 (16/6/2026) added root motion |
| **Universal Animation Library 2** | 1 rig | FBX **GLB** Blend | CC0 | **17 MB** | 130+ more: combos, parkour, zombie locomotion |
| **Modular Character Outfits – Fantasy** | 12 outfits / 62 parts | FBX OBJ Blend glTF | CC0 | 280 MB | outfit swapping on the UBC rig (fantasy, not S.H.I.E.L.D.) |
| **Ultimate Animated Character Pack** (Nov 2019) | 52 | FBX OBJ Blend — **no glTF** | CC0 | via itch | 50+ characters with clips; needs conversion |
| **LowPoly Robot** | 1 | FBX OBJ Blend | CC0 | **6.6 MB** | robot. *"14 Animations! (idle, jump, dance, punch, run, death, sitting, standing, thumbs up, wave, yes and no)"* |
| **Animated Mech Pack** | 4 | FBX OBJ Blend **glTF** | CC0 | via itch | heavier robot |
| **LowPoly Animated Easy Enemies** | several | FBX OBJ Blend | CC0 | **2.9 MB** | *"Each enemy has a movement, attack, jump and death animation"* |
| **Sci-Fi Essentials Kit** | 65 | FBX OBJ Blend glTF | CC0 | 159 MB | *"animated robot enemies, textured guns, animated screens, crates"* — the A.I.M. lab and the Doombot |
| **Stylized Nature MegaKit** | 116 | FBX OBJ Blend glTF | CC0 | 99 MB | Plains/Heath dressing (40 trees, 35 plants, 27 rocks) |
| **Bestiary – Dungeon Monsters Kit** | 7 | FBX OBJ Blend glTF | **QAL** | 45 MB | *"(This kit doesn't include any animations)"* — skip it twice over |

Two gotchas: **the older packs ship no glTF** (the pack page's Formats badge is
authoritative — *Ultimate Animated Character Pack* and *LowPoly Robot* are FBX /
OBJ / Blend only), and **downloads are on itch.io behind a "name your own price"
button**, not a direct link from quaternius.com.

### 2.2 KayKit (Kay Lousberg) — CC0, and glTF in the box

`web:` <https://kaylousberg.com/game-assets> · <https://kaylousberg.itch.io/>

Every pack page carries the same two sentences, quoted verbatim from the
Adventurers page: *"Free for personal and commercial use, no attribution
required. (CC0 Licensed)"* and *"These assets are CC0 so you can use them freely.
But please don't resell unmodified copies or claim them as your own."* — a request,
appended to CC0, not a licence term. Formats: *"Included files are .FBX, .GLTF"*.

| Pack | Contents | Free zip | Note |
|---|---|---:|---|
| **Character Pack : Adventurers** | 5 rigged, animated characters + 25 accessories | **12 MB** | *"Textured using a single gradient atlas texture (1024×1024) that can be downsampled to 128×128"* |
| **Character Animations** | **161 humanoid animations** in sets (general / movement / melee / ranged / simulation / **special: skeleton — "and mechanical characters"** / tool) | **14 MB** | split per rig: `Rig_Medium`, `Rig_Large` |
| **Character Pack : Skeletons** | 4 rigged skeletons | 7.7 MB | the "mechanical" clip set targets this rig |
| **Mystery Monthly : Series 6** | 14 characters (Jul 2025–Jun 2026) | 39 MB | CC0 |
| **Medieval Hexagon Pack** | 200+ hex tiles, buildings, props | 33 MB | a second candidate for lands |
| **Space Base Bits** | 48+ modular sci-fi props | 5.2 MB | Helicarrier deck / A.I.M. lab dressing |
| **Board Game Bits** | meeples, figures, tokens, pawns, dice | 35 MB | `inferred:` a *figurine* look for the Soldier token — the deck is on a table, after all |
| **Prototype Bits** | 64+ blockout pieces | 4.8 MB | for standing a Tier 2 scene up before any art lands |

The KayKit clip list is the best-shaped one for our cue kit — *"General
animations: like idling, getting hit, death, spawning, interacting"* maps one-to-one
onto `zone.enters` / `damage.hit` / `zone.dissolve`.

### 2.3 Kenney — CC0, tiny, and glTF-first

`web:` <https://kenney.nl/assets/category:3D>. Every 3D pack page states
**"License · Creative Commons CC0"**, and the `License.txt` inside each zip says
it again (`measured:`, from `kenney_hexagon-kit.zip`):

> `License: (Creative Commons Zero, CC0)`
> `http://creativecommons.org/publicdomain/zero/1.0/`
> `You can use this content for personal, educational, and commercial purposes.`
> `Support by crediting 'Kenney' or 'www.kenney.nl' (this is not a requirement)`

`measured:` zip sizes, by HEAD against the download URL on each page:

| Pack | Zip | Formats in the zip | Animated? |
|---|---:|---|---|
| Animated Characters Protagonists | **581,441 B** | **FBX only** — `Model/characterMedium.fbx` + `Animations/{idle,jump,run}.fbx` + PNG/SVG skins | 3 clips |
| Animated Characters Survivors | 718,027 B | FBX only | 3 clips |
| **Blocky Characters** (v2.0) | **2,148,510 B** | FBX + **GLB** + OBJ, 18 characters | **27 clips** |
| **Mini Characters** | 2,403,059 B | FBX + **GLB** + OBJ, 12 characters + aids/wheelchairs | **32 clips** |
| **Cube Pets** (v2.0, 2026) | 2,812,444 B | FBX + **GLB** + OBJ, 24 animals | **8 clips** |
| **Hexagon Kit** (v2.0) | 2,448,931 B | FBX + **GLB** + OBJ, 72 tiles | — |
| Nature Kit | 10,537,521 B | FBX + GLB + OBJ, 330 files | — |
| Space Kit | 6,677,531 B | FBX + GLB + OBJ, 150 files | — |
| Particle Pack (2D · VFX) | 15,001,764 B | 80 × 512² PNG sprites | — |

**`measured:` what is actually inside those GLBs** — I extracted and parsed the
JSON chunk of four of them:

| File | Bytes | Tris | Meshes | Skins / joints | Materials | Images | Clips |
|---|---:|---:|---:|---|---:|---:|---|
| `blocky-characters/GLB/character-a.glb` | 113,596 | **72** | 6 | **0** | 1 | 1 | **27**: static, idle, walk, sprint, sit, drive, **die**, pick-up, emote-yes/no, holding-{right,left,both}{,-shoot}, **attack-melee-{right,left}**, attack-kick-{right,left}, interact-{right,left}, wheelchair-× 5 |
| `mini-characters/GLB/character-male-a.glb` | 246,916 | **723** | — | **2 / 7 each** | — | 1 | **32**: the blocky set plus jump, fall, crouch |
| `cube-pets/GLB/animal-bee.glb` | 164,356 | — | 7 | **0** | — | — | **8**: static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| `hexagon-kit/GLB/grass.glb` | 4,680 | **32** | 1 | 0 | — | 1 | — |

All four report `"generator": "UnityGLTF"`. All four share **one 512×512
`colormap.png`** per kit (`measured:` 8,706 B for Mini Characters, 10,831 B for
Hexagon Kit, 10,915 B for Cube Pets) — i.e. **one texture, ~1.33 MiB of VRAM with
mips, for an entire kit**, against the 47.3 MiB §9.1 already budgets for 28 card
faces. Texture VRAM is a non-issue for Kenney assets.

Two things follow. **(a)** Kenney's characters are *not* Mixamo-compatible — the
blocky ones have no skeleton at all and the mini ones have 7 joints. They come
with their own clips instead, and the clip set is identical across the kits, so
one cue→clip mapping serves all of them. **(b)** The "Animated Characters" series
(protagonists / survivors / retro) is the *old* line: FBX only, three clips, no
attack and no death. Ignore it; the blocky and mini lines supersede it.

### 2.4 Poly Pizza — per-model CC0, glTF served directly

`web:` <https://poly.pizza/> — *"Build something beautiful with 10,600+ free
models"*, aggregating Google's Poly archive, Quaternius, Kenney and individual
uploaders. Each model page states its licence inline; the Quaternius entries read
**"FBX/GLTF format • Public Domain (CC0)"**.

This is the fastest route to a *single* model without a 122 MB zip. `measured:`
I fetched three GLBs straight off `static.poly.pizza` and parsed them:

| Model (all Quaternius, all CC0) | Bytes | Tris | Skins / joints | Materials | Clips |
|---|---:|---:|---|---:|---|
| **Man in Suit** — <https://poly.pizza/m/mQnGoME1ez> | 583,416 | 2,058 | 1 / **31** | **7** | 11: `Man_Idle`, `Man_Punch`, `Man_Death`, `Man_Walk`, `Man_Run`, `Man_Jump`, `Man_RunningJump`, `Man_SwordSlash`, `Man_Clapping`, `Man_Sitting`, `Man_Standing` |
| **Robot Enemy Flying** — <https://poly.pizza/m/lF3jeRJwiH> | 298,324 | 4,544 | 2 / **11** | — | 6: `Attack`, `Dead`, `Idle`, `Run`, `Shoot`, `Walk` |
| **Bee Enemy** — <https://poly.pizza/m/6HsU6GQt3a> | 193,200 | 3,040 | 1 / **9** | — | 4: `Bite_Front`, `Death`, `Flying`, `HitRecieve` |

All three report `"generator": "FBX2glTF v0.9.7"` and carry **no images** —
they are vertex-coloured, which is why *Man in Suit* has seven materials.

Note the clip naming: FBX2glTF prefixes the armature, so a clip is
`"CharacterArmature|Attack"`, not `"Attack"`. `inferred:` a Tier 2 cue→clip map
must normalise on the substring after `|`, or the mapping silently misses.

**Poly Pizza's terms are worth reading before automating anything**: the ToS
opens *"No, you can't scrape the site to feed your shitty AI"*
(<https://poly.pizza/docs/tos>). A handful of manual downloads is ordinary use; a
crawler is not. There is an API (`/docs/api/v1.1`), though the docs page rendered
blank today.

### 2.5 Sketchfab — the CC0 filter does not contain what Tier 2 needs

`web:` the v3 API is live and public.
`https://api.sketchfab.com/v3/licenses` returns ten licences with slugs
`by`, `by-sa`, `by-nd`, `by-nc`, `by-nc-sa`, `by-nc-nd`, `cc0`, `free-st`, `st`,
`ed`. `measured:` I ran three searches against
`https://api.sketchfab.com/v3/search?type=models&downloadable=true…`:

| Query | Result |
|---|---|
| `license=cc0&animated=true&q=robot` | **0 results** |
| `license=cc0&q=robot` | **0 results** |
| `license=cc0&animated=true` (no query) | museum scans — *"Bivalve: Anadara lienosa (PRI 70070)"* 334,622 faces; a Japanese toad 69,694 faces; a lavabo 538,912 faces |
| `license=by&animated=true&q=robot` | real results — *Biped robot* 16,618 faces / 1 clip; *Robot Playground* 11,816 / 1; *Autonomous Robot Sweeper* 15,644 / 1 |

The picture is unambiguous: **Sketchfab's CC0 corner is cultural-heritage
photogrammetry, not game rigs**, and its game rigs are CC-BY with face counts an
order of magnitude above anything we want, usually with a single clip. CC-BY 4.0
is perfectly usable in a GPL repo (attribution, no copyleft — it would go in
`NOTICE` beside the MIT entries), but between "one clip at 16k faces with an
attribution obligation" and "six clips at 4.5k faces under CC0", the choice makes
itself. Also note that downloading a Sketchfab model requires an authenticated
account; there is no anonymous download endpoint. And the paid Store assets are
governed by <https://sketchfab.com/licenses>, whose Standard licence forbids
letting others access the asset "as a stand-alone file" — a non-starter for a
public repo.

`inferred:` keep Sketchfab as a **last-resort search** for one specific prop
(a Helicarrier silhouette, say), under `license=by`, with the attribution written
into `NOTICE` on the same commit.

### 2.6 Two more CC0 sources worth having in the file

- **Poly Haven** — <https://polyhaven.com/license>: *"Our assets are all licensed
  as CC0… You can redistribute them, share them around, include them when sharing
  your own work, or even in a product you sell."* HDRIs, PBR textures, and models.
  The explicit redistribution sentence is exactly what a public repo needs.
- **ambientCG** — <https://ambientcg.com/>: *"All assets are released under the
  Creative Commons CC0 license, making them free to use without attribution - even
  in commercial circumstances."* The site exists specifically because its author was
  *"frustrated with the licensing policies of many other texturing platforms, which
  limit or forbid texture redistribution."* PBR surfaces for land tiles.

### 2.7 Coverage matrix — archetype → pack

| Archetype | First choice | Clips it brings | Licence | Backup |
|---|---|---|---|---|
| human agent / hero (`creature/W`, `creature/U`) | **Kenney Mini Characters** (`character-male-a.glb`, 247 KB, 723 tris, 7 joints) | idle, walk, **die**, **attack-melee**, attack-kick, **holding-both-shoot** (= the pistol draw), emote-yes/no | CC0 | Quaternius **Man in Suit** (583 KB, 31 joints, Punch/Death/Idle) — a *suit*, which is on the nose for S.H.I.E.L.D. |
| robot / drone (Aerial Doombot) | **Quaternius Robot Enemy Flying** (298 KB, 4,544 tris) | **Idle, Attack, Shoot, Dead**, Walk, Run | CC0 | Quaternius *Animated Mech Pack* (glTF, CC0); *LowPoly Robot* (14 clips, FBX only) |
| insect (Flying Ant, Air Force) | **Kenney Cube Pets** `animal-bee.glb` (164 KB, 0 skins) | idle, walk, run, eat | CC0 | **Quaternius Bee Enemy** (193 KB) — has `Bite_Front`, `Death`, `HitRecieve`, `Flying`: the better clip set |
| scientist (A.I.M., Biochemist) | Kenney Mini Characters + a bench from **KayKit Space Base Bits** (5.2 MB) | as above | CC0 | Quaternius *Sci-Fi Essentials Kit* (159 MB, animated screens) |
| Soldier token | Kenney Mini Characters, plainer skin, or **KayKit Board Game Bits** meeple | idle, attack, die | CC0 | — |
| duelist avatars | Kenney Mini / Quaternius **Universal Base Characters** ("Superhero" proportions) | idle | CC0 | — |
| lands | **Kenney Hexagon Kit** `grass/water/sand/stone.glb` (3.5–4.7 KB each) | — | CC0 | KayKit Medieval Hexagon (33 MB); procedural (§7) |
| clip library for retargeting | **Quaternius UAL + UAL2** (32 MB, 250+ clips, GLB, Mixamo-compatible rig) | everything | CC0 | KayKit Character Animations (14 MB, 161 clips) |

**Every first choice is CC0 and therefore committable.** The whole first-choice
column, uncompressed and before any optimisation, is under **4 MB** of GLB.

---

## 3. Mixamo — usable, not redistributable, and now avoidable

`web:` <https://www.mixamo.com/> is up today and its footer points at
<https://www.adobe.com/legal/terms.html>.

**Terms, as stated by Adobe.** The Mixamo FAQ (`web:`
<https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html>, its own page note
reads "Last updated on Sep 14, 2021"):

> "Mixamo is available free for anyone with an Adobe ID and does not require a
> subscription to Creative Cloud." … "You can use both characters and animations
> royalty free for personal, commercial, and non-profit projects including:
> Incorporate characters into illustrations and graphic art. 3D print characters.
> Create films. **Create video games.**"

Two restrictions on the same page: Mixamo "is not available for Enterprise and
Federated IDs" nor "for users who have a country code from China", and only "the
last used character is stored" — so **save your rigged characters locally**.

**The auto-rigger is humanoid-only, and fussy.** Verbatim, same page:

> "Can I auto-rig and animate animals, vehicles, or other objects? **No.**
> Currently, the auto-rigger and animation libraries are for bipedal humanoids
> only."

Its stated requirements: humanoid with distinguishable head/body/arms/legs; no
large extra appendages, wings or tails; default/neutral pose; nothing else in the
file (no cameras or helpers); no gaps between parts ("does not work on floating
heads"); centred at the world origin; clean mesh. `inferred:` that rules out the
insect and the drone outright, and makes the Doombot a coin toss.

**Redistribution — the answer Tier 2 needs.** The binding document is Adobe's
General Terms of Use, whose §6 "User Conduct" says you must not "**6.2 copy,
modify, host, stream, sublicense, or resell the Services and Software**", where
"Software" is defined to include "Sample Files and Content Files". The practical
gloss everyone works from is the long-standing licensing FAQ thread on Adobe's
own community (`web:`
<https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400>
— note this is a **community post, not an Adobe legal page**; treat it as the
plain-English reading, not the contract):

> "**YES, you can create…** Video Games · DLC or Addon Content for Games ·
> Movies/Videos · Illustrations and Prints · 3D Prints · Merchandise
> **NO, you cannot create…** Blueprints, templates, or asset packages for video
> game engines which redistribute character or animation raw files as the
> product · Packages for 3D stock or asset store websites where character or
> animation raw files will be sold or distributed · **Any type of free
> distribution of character or animation raw files**"
>
> "As you can see above, really the only thing you can't do is distribute the raw
> character and animation files."

It also states "The only research application Mixamo content can't be used in is
training machine-learning models", and that no credit to Adobe is required.

**Verdict for this repo:** Mixamo clips may drive the arena on the developer's
machine; a `.fbx` or a converted `.glb` derived from them **must not be
committed**. That is the same rule as the card art, and it wants the same
mechanism: a `web/public/models/` path that is gitignored, and a documented
"where to get them" note. `inferred:` given finding 4 — a CC0 library of 250+
clips on a rig its own page calls Mixamo-compatible — **the recommendation is to
not use Mixamo at all**, and to keep it as a fallback for one specific missing
motion.

**Reliability, stated because it is a real risk.** `web:` searches surface
repeated multi-day Mixamo outages through 2025 and 2026 and at least one Adobe
support reply telling a user "Mixamo is not supported anymore". The service
rendered fine today. `inferred:` do not build a pipeline whose one input is a
free service Adobe has not updated its FAQ for since 2021.

**Getting Mixamo output into three.js** — Mixamo exports FBX (and a Collada
option); there is no glTF export. The conversion paths are §5.7's, and they are
the same two paths the CC0 FBX-only packs need.

---

## 4. Image-to-3D and text-to-3D

### 4.1 Hosted services

| Service | Free tier | Paid entry | Output formats | Rigging / animation | Licence of outputs |
|---|---|---|---|---|---|
| **Meshy** (<https://www.meshy.ai/pricing>) | 100 credits/mo ≈ 10 assets, 1 concurrent task, 10 downloads/mo | **Pro $20/mo** — 1,000 credits ≈ 100 assets, unlimited downloads, API | `.fbx .obj .usdz .glb .stl .blend` | **Yes, on every tier**: "Rigging & animation"; animation library **20** motions free, **500+** paid; "AI Auto Rigging", "Custom Pose" | **Free tier: CC BY 4.0**. Paid: "Private & Customer owned" — *"you own the assets created through our platform, **provided that you have used materials that do not violate the copyrights of others**"* |
| **Tripo** (<https://www.tripo3d.ai/pricing>) | 200 credits/mo ≈ 13 models — **"Public Models · Non-Commercial Use"** | **Pro $20/mo** billed annually ($240/yr) — 3,000 credits ≈ 200 models, "Private Models · Commercial Use" | not stated on the pricing page; DCC bridges to Blender/Unity/Unreal/Godot | **Pro and above**: "Rigging & Animation"; "Auto Rig" costs **20 credits** | free = public + non-commercial; paid = private + commercial |
| **Rodin / Hyper3D** (<https://hyper3d.ai/pricing>) | generate free "before confirmation", 10 private assets, $1.5/credit pay-per-result | **Creator $24/mo** billed yearly ($288) ≈ 60 models; **Business $96/mo** for API | not stated on the pricing page | **none surfaced** — the feature list is image/text-to-3D, texture, HDRI, segmentation | Creator: "Unlimited export and any use"; Business: "Commercial license included" |
| **Luma** | — | — | — | — | **Discontinued as a 3D product.** `measured:` `lumalabs.ai/genie` 302s to the homepage, which contains the string "3D" zero times |

`inferred:` for Tier 2's purposes Meshy is the only one of these that closes the
loop on its own (mesh **and** rig **and** a motion library), and its free tier's
CC BY 4.0 output would be committable *if the input were ours*. That proviso is
the whole game — see §4.3.

### 4.2 Local, open-source, and this machine can run some of it

`measured:` this box has a **GTX 1080, 8,192 MiB VRAM**, a Ryzen 7 9700X and 30 GB
RAM. It has **no Blender** (`which blender` → nothing) and **no PyTorch**
(`import torch` → ModuleNotFoundError). Node 24.20.0 / npm 11.19.0 are present.

| Project | Licence (`web:` GitHub API, today) | Activity | Fit here |
|---|---|---|---|
| **TripoSR** (VAST-AI-Research) | **MIT** — README: *"The model is released under the MIT license, which includes the source code, pretrained models, and an interactive online demo."* | pushed **2026-06-04**, 6,948 ★ | **the only fully-MIT weights on this list.** README: ~**6 GB VRAM** for one image, "<0.5 s on an NVIDIA A100". 6 GB fits the 1080 |
| **TRELLIS** (microsoft) | **MIT** | pushed **2026-06-26**, 13,628 ★ | best quality of the open set; heavier VRAM than TripoSR — not verified against 8 GB |
| **InstantMesh** (TencentARC) | **Apache-2.0** | pushed **2025-01-03**, 4,522 ★ | dormant for 20 months |
| **Hunyuan3D-2.1** (Tencent-Hunyuan) | **"Other" / NOASSERTION** — the *Tencent Hunyuan 3D 2.1 Community License* | pushed 2025-10-17, 4,016 ★ | **read the licence before touching it**: territory is "the worldwide territory, **excluding** the European Union, United Kingdom and South Korea"; >1M MAU needs a separate grant; outputs may not be used "to improve any other AI model"; distributions must carry the agreement and disclose machine generation |
| **UniRig** (VAST-AI-Research) | **MIT** (repo **and** the Hugging Face weights card: `License: mit`) | pushed **2026-06-04**, 1,747 ★, SIGGRAPH 2025 | **the auto-rigger Mixamo is not**: inputs `.obj .fbx .glb .vrm`, outputs FBX/GLB, two stages (skeleton prediction, then skinning weights), **≥ 8 GB VRAM** — exactly this GPU's ceiling. Non-humanoid capable, so it is the path for an insect or a drone |

`inferred:` the runnable local pipeline on this hardware is **TripoSR → UniRig →
glTF-Transform**, entirely MIT, no account, no upload of anything anywhere. Both
need a CUDA PyTorch install that does not exist yet, which is a real evening of
setup before the first mesh appears.

### 4.3 The legal position on generating a model from Marvel card art

This is the section to be careful in, and the honest answer is short.

**The facts.** The art on these cards is Marvel's, licensed to Wizards. `web:`
the Wizards Fan Content Policy (<https://company.wizards.com/en/legal/fancontentpolicy>)
permits fan content using *Wizards'* IP on non-commercial terms, requires the
notice *"[Title] is unofficial Fan Content permitted under the Fan Content
Policy. Not approved/endorsed by Wizards."*, and draws the third-party line in one
sentence:

> "If you don't have the rights to use another person's stuff in your Fan
> Content—**don't**."

`inferred:` Marvel's characters are "another person's stuff" as far as this
project is concerned. The Fan Content Policy is a permission from Wizards for
Wizards' IP; it is not a sub-licence of Marvel's.

**What the generators themselves say.** Meshy's ownership grant is conditioned —
*"provided that you have used materials that do not violate the copyrights of
others"* — so feeding it a card crop does not merely leave you where you started,
it puts you outside the grant you are relying on. `inferred:` an output generated
from infringing input is not "yours" under Meshy's own terms, whatever the tier.

**The line this project should draw, and it is the line already drawn.**

- **Personal/local use:** a model generated from a card's art, kept on the
  developer's disk and rendered in a local client that is already displaying the
  same art from `cards.scryfall.io`, is in the same position as the cached JPEG.
  It is not a new exposure. `inferred:`, and it is a judgement, not advice.
- **Publishing:** committing such a model, shipping it in a build, or putting it
  in a release is distributing a derivative of Marvel's art. **Never.** It fails
  the Fan Content Policy's third-party sentence, it fails the generator's own
  grant, and — a separate problem nobody mentions — it would make the GPL source
  distribution contain a file the project has no right to license onward.
- **The stylised alternative is not a loophole, it is the actual answer.** Tier 2
  as `arena-mode.md` specifies it is *"stylised generic models keyed by creature
  type and colour"* — a generic agent, a generic drone, a generic insect. A CC0
  man in a suit standing where "Agent 13, Sharon Carter" is played is not a
  derivative of Sharon Carter's art; it is the Tier 1 cue kit with a silhouette.
  **The tier was specified this way for a reason, and the reason holds.**

---

## 5. three.js tooling — what is already installed, and the four things that bite

### 5.1 Installed today (`measured:` from this repo's `web/node_modules`)

`three@0.186.0` (and `web:` `registry.npmjs.org/three/latest` is **0.186.0**
— the pin is current), `@react-three/fiber@8.18.0`, `@react-three/drei@9.122.0`
(MIT), `three-stdlib@2.36.1` (MIT, drei's transitive loader source).

Everything Tier 2 needs is already in the tree — no new runtime dependency is
strictly required:

```
three/examples/jsm/loaders/GLTFLoader.js      117,570 B
three/examples/jsm/loaders/DRACOLoader.js      19,030 B
three/examples/jsm/loaders/KTX2Loader.js       36,567 B
three/examples/jsm/loaders/FBXLoader.js       113,372 B
three/examples/jsm/libs/meshopt_decoder.module.js  29,256 B
three/examples/jsm/libs/draco/gltf/draco_decoder.wasm     192,420 B
three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js   58,456 B
three/examples/jsm/libs/basis/basis_transcoder.wasm       527,333 B
three/examples/jsm/utils/SkeletonUtils.js   — clone():392, retarget():39, retargetClip():226
three/src/animation/AnimationMixer.js       — update():676, setTime():722
```

`measured:` the GLTFLoader in 0.186.0 advertises **KHR_draco_mesh_compression,
EXT_meshopt_compression, KHR_texture_basisu, KHR_mesh_quantization,
KHR_materials_unlit, KHR_materials_variants, EXT_mesh_gpu_instancing,
KHR_animation_pointer** among others. And `THREE.BatchedMesh`, `InstancedMesh`,
`SkinnedMesh` and `AnimationMixer` are all in core.

### 5.2 Compression: pick Meshopt, skip Draco, skip KTX2

The three compressions are not equally priced *for this project*:

| Scheme | Runtime cost | Verdict |
|---|---|---|
| **Meshopt** (`EXT_meshopt_compression`) | **29,256 B** of JS, and that is all — the decoder module embeds its own wasm as base64, so there is **no extra file to host** | **Use this.** One import, no `public/` asset, no fetch |
| **Draco** | 19,030 B loader **plus** a decoder that must be *served*: 192,420 B `.wasm` + 58,456 B wrapper ≈ **250 KB copied into `web/public/`** | Only if Meshopt under-performs on the actual meshes. See §5.4 for the trap |
| **KTX2 / Basis** | 36,567 B loader **plus** a **527,333 B** transcoder wasm | **No.** The entire Kenney texture set is one 512² PNG of ~9 KB per kit. Spending 585 KB of transcoder to compress 9 KB of texture is absurd |

`inferred:` given that the whole first-choice model set is under 4 MB raw and
arrives from `web/public/` over localhost, the honest answer may be **no geometry
compression at all** for the first Tier 2 evening. `gltf-transform prune + dedup +
join + weld` will do more for the draw-call budget than Draco will do for the byte
budget, and bytes are not this project's problem.

### 5.3 `AnimationMixer`, clip blending, and how a clip becomes an offset

The Tier 1 invariant is §5.1: `finalTransform = layout(state) ⊕ offsets[id]`,
where an offset "starts at identity, is written by running cues, and returns to
identity when every cue touching that card has finished". A skeletal clip does not
naturally behave like that — it has its own clock and it keeps going.

**`AnimationMixer.setTime(time)` is the bridge** (`measured:` `AnimationMixer.js:722`).
`inferred:`, the pattern that preserves all four of §5.1's properties:

- a cue owns a clip's **normalised progress**, exactly as it owns a tween's;
  `action.time = progress × clip.duration` (or `mixer.setTime`) is written once per
  frame from `CueRunner`'s existing loop, after `queue.tick(now)`;
- **skip** = set progress 1 → the clip is at its last frame → then the cue ends and
  the figure returns to its idle action, which *is* its identity;
- **scrub / `flushAndSnap()`** = set every action back to the idle at time 0, which
  is a single pass over the rig map — no per-clip rewind logic, same as today;
- **the "identity" of a figure is its idle action**, not an empty pose. That is the
  one genuinely new concept Tier 2 adds to the model, and it should be written down
  in `types.ts` next to `Presence` when it is built.

For blending, `AnimationAction` already has `crossFadeTo`, `crossFadeFrom`,
`fadeIn`, `fadeOut`, `setEffectiveWeight`, `setEffectiveTimeScale`, `setDuration`,
`syncWith`, `halt` and `warp` (`measured:` `AnimationAction.js`). A 150 ms
`crossFadeTo` from `idle` to `attack-melee-right` and back is the whole of what
`attack.lunge` needs.

**The `frameloop: 'demand'` collision, and it is a real cost.** §5.4's rule is that
the arena renders **zero frames** while nothing is happening. A creature with a
looping idle animation makes something always happen. Three ways out, in order of
preference (`inferred:`): **(a)** play idles only while the cue queue is non-empty,
and freeze figures on a single pose otherwise — the board is a still photograph
between plays anyway; **(b)** drive a slow idle from a timer at 10–15 Hz via
`invalidate()`, which costs a fraction of a 60 Hz loop; **(c)** accept
`frameloop: 'always'` and let `DprGovernor` pay for it. Option (a) preserves the
single largest power win Tier 1 bought, and it is a one-line condition in
`CueRunner`.

### 5.4 drei helpers — three useful, two traps

`measured:` in `@react-three/drei@9.122.0`:

- **`useGLTF(path, useDraco?, useMeshopt?, extendLoader?)`** with
  `.preload()`, `.clear()` and `.setDecoderPath()`; plus a `<Gltf src>` component
  that wraps `Clone`. **Trap:** `Gltf.js:8` is
  `let decoderPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/'`,
  and `useGLTF(path, true)` calls `dracoLoader.setDecoderPath(decoderPath)`. That
  is a third-party network fetch, which report 09 §2.1 rule 1 forbids the arena
  outright. If Draco is ever used, `useGLTF.setDecoderPath('/draco/')` must be
  called first, with the 250 KB of decoder copied from
  `three/examples/jsm/libs/draco/gltf/` into `web/public/draco/`. `inferred:`
  `liveness.test.ts` already asserts source-level properties of this kind; an
  assertion that no arena module mentions `gstatic.com` is two lines and closes it
  permanently.
- **`useAnimations(clips, root) → { ref, clips, mixer, names, actions }`**, with
  actions created lazily per name. **Trap:** its implementation is
  `useFrame((state, delta) => mixer.update(delta))` — **one extra frame callback
  per creature**, which breaks §9.2's "one `useFrame`, and it is in
  `CueRunner.tsx`". `inferred:` Tier 2 should build its mixers by hand
  (`new THREE.AnimationMixer(root)`, kept in the `rigs.ts` map beside `mesh`,
  `material` and `uniforms`) and advance them from `CueRunner`'s existing loop as
  a step 2.5. That is fewer lines than using the hook, and it keeps the frame loop
  auditable.
- **`<Clone object deep keys inject>`** — a shallow/deep clone component. Useful,
  but for *skinned* meshes the correct tool is
  `SkeletonUtils.clone()` (`measured:` present at `SkeletonUtils.js:392`), which
  rebinds the skeleton; a naïve `Object3D.clone()` shares the skeleton and every
  copy animates identically.
- **`<Instances>` / `<Instance>` / `Merged`** — `InstancedMesh`-backed, and
  `InstancedMesh` **cannot skin**. Correct for the land tiles and for a swarm of
  rigid ants; wrong for figures.
- Also present and already paid for: `Sparkles`, `shaderMaterial`, `Outlines`,
  `Billboard`, `Text`, `Trail`, `Cloud`, `Stars`, `MeshReflectorMaterial`,
  `MeshDistortMaterial`, `MeshWobbleMaterial`.

### 5.5 Skinned-mesh performance, and what the budget actually says

**How three skins, verified in the installed source.** `Skeleton.computeBoneTexture()`
builds a `DataTexture` of bone matrices (`RGBAFormat`, `FloatType`) and
`WebGLRenderer.js:2696` calls it lazily on first render, so **there is no
uniform-based bone-count ceiling** — the old "max 64 bones" folklore does not apply
to 0.186.0. The vertex shader (`skinning_vertex.glsl.js`) applies exactly **four
weighted bone influences** per vertex. Cost per skinned figure: one float texture
(tiny: 7–31 bones), one extra vertex-shader path, and CPU work in the mixer.

**The budget, with the measured corpus numbers.** §9.1 allows **≤ 120 draw calls,
≤ 2,000 triangles, ≤ 12 geometries**; Tier 1 uses **40 / 80 / 1**. `measured:` the
worst frame in the corpus has **21 creatures**; p95 is 10.

| Figure | Draw calls each | 21 figures | Tris each | 21 figures | Verdict against §9.1 |
|---|---:|---:|---:|---:|---|
| Kenney **Blocky** (6 meshes, 1 material, no skin) | 6 | **126** | 72 | **1,512** | triangles **pass** (!), draw calls **fail** by 6 before Tier 1's 40 are added |
| Kenney **Mini** (2 skins) | ~2 | **42** | 723 | 15,183 | draw calls **pass** (82 total), triangles **7.6× over** |
| Quaternius **Man in Suit** (7 materials) | 7 | **147** | 2,058 | 43,218 | both **fail** as shipped |
| Quaternius **Man in Suit**, after `palette`+`join` | 1 | **21** | 2,058 | 43,218 | draw calls **pass** comfortably |
| Quaternius **Universal Base Characters** ("avg 13k tris") | ? | ? | 13,000 | **273,000** | triangles far over; a different class of asset |

Two conclusions. **(a) The ≤ 2,000 triangle line is a Tier-1 artefact** — it was
written for a scene of forty quads and any figure library voids it. 43k triangles
is nothing for a GPU in absolute terms; the line should be *re-derived* for Tier 2
(`inferred:` ~60k is a defensible new ceiling on an iGPU at these draw-call
counts) rather than quietly ignored. **(b) The draw-call line is the one that is
genuinely tight, and the fix is offline, not runtime** — `gltf-transform palette`
+ `join` on the way in, once, in a build step nobody runs at page load.

CPU: 21 `AnimationMixer.update()` calls over rigs of 7–31 bones, per frame. Report
09 measured the entire Tier 1 frame *body* at p50 0.1 ms. `inferred:` mixers will
be the largest new CPU item and are still likely to be sub-millisecond at 21
figures, but this is the number Tier 2's E-whatever evening must actually measure
rather than assume — `tools/arena-bench.mjs` already exists and takes a
configuration.

### 5.6 The react-three-fiber pattern for many animated figures

There is no instanced-skinning shortcut. `web:` three.js PR
[#22667 "InstancedSkinnedMesh"](https://github.com/mrdoob/three.js/pull/22667) is
**closed and unmerged** (opened 2021-10-10, last touched 2023-11-10), and
`measured:` `BatchedMesh.js` contains the string "skin" **zero** times. The
options, honestly ranked for this project:

1. **One cloned `SkinnedMesh` + one `AnimationMixer` per figure** (`SkeletonUtils.clone`).
   Simple, correct, and at 21 figures entirely affordable. **Recommended.**
2. **Rigid, node-animated figures** (Kenney blocky/cube-pets style) — no skinning
   at all, and after `join` on the *static* parts they are ordinary meshes. Cheaper
   still, at the cost of the look.
3. Vertex-animation textures (bake the skeleton into a texture, animate by sampling
   it). The technique that scales to hundreds. `inferred:` **not worth it at 21**;
   it would be a week of work to save a millisecond.

The r3f shape that fits the existing architecture (`inferred:`, and it is
deliberately the same shape `CardPlane` already has):

- one lazy `useLoader(GLTFLoader, '/models/figures.glb')` — **one merged GLB for the
  whole library**, so it is one fetch, one parse, one shared texture and one
  `useGLTF` cache entry;
- a `<Figure>` component per creature, memoised on `(id, archetypeKey)`, which on
  mount does `SkeletonUtils.clone(scene.getObjectByName(archetype))`, builds its
  mixer, and registers `{ root, mixer, actions }` in the **existing `rigs.ts` ref
  map** — keyed by placement key, exactly as cards already are;
- **no props drive the pose.** `CueRunner`'s single `useFrame` writes
  `layout(state) ⊕ offsets[card.id]` to the figure's root and sets clip times. The
  figure is anchored to the card's placement, so `presence` (the Helicarrier's
  hover) keeps working unchanged;
- hit-testing stays on the invisible `HitProxy` quads at the resting pose. **A
  figure must not be raycastable**, or a lunging creature becomes a moving click
  target and §5.5's whole guarantee unravels.

### 5.7 The offline pipeline

**FBX → glTF.** Two paths, and both are needed for different inputs:

- **FBX2glTF** (`web:` <https://github.com/facebookincubator/FBX2glTF>) — not
  archived, pushed **2026-03-27**, 2,346 ★, **3-clause BSD** per its README.
  Building it needs the **Autodesk FBX SDK 2019.2**; the prebuilt binaries avoid
  that, but `measured:` **the newest release is v0.9.7, from 2019-08-10**
  (`FBX2glTF-linux-x64`, 12,856,400 B). That is the exact string Poly Pizza's
  Quaternius GLBs carry in `asset.generator`, so it demonstrably works on these
  assets. `--binary` for `.glb`, `-d/--draco`, `--anim-framerate {24,30,60}`; all
  animation is baked keyframe-by-keyframe.
- **Blender, headless** (`web:` Blender **5.2 LTS** manual). The FBX importer has
  been rewritten and has its own page now
  (<https://docs.blender.org/manual/en/latest/files/import_export/fbx.html>):
  *"Blender's FBX importer supports a broad range of FBX features and is designed
  to be fast, memory-efficient…"*, and *"Each FBX 'take' is imported as a separate
  Action, with each animated object assigned to its own Action Slot."* The glTF
  exporter (<https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html>)
  *"supports Metal/Rough PBR (core glTF) and **Shadeless (KHR_materials_unlit)**
  materials"* and has *"Draco Compression — Compress meshes using Google Draco"*
  built in. Blender is GPL, which sits well with this repo's toolchain.
  `measured:` **not installed here.**

**glTF → optimised glTF: `@gltf-transform/cli`** (`web:` npm — **v4.5.0, MIT**,
bin `gltf-transform`; docs <https://gltf-transform.dev/cli>). Pure npm, no native
SDK, and Node 24 is already on this box. The commands Tier 2 wants, in order:

```
prune      remove unreferenced properties
dedup      deduplicate accessors and textures
palette    creates palette textures and merges materials   ← the draw-call fix
join       join meshes and reduce draw calls               ← the draw-call fix
weld       merge equivalent vertices
unlit      convert materials from metal/rough to unlit     ← matches §9.2 rule 3
resample   resample animations, losslessly deduplicating keyframes
merge      merge two or more models into one               ← one library GLB
meshopt    compress geometry and animation with Meshopt
inspect    print the contents (tris, materials, clips) of a file
```

**`unlit` deserves its own sentence.** Report 09 §9.2 rule 3 is "No lights, no
shadow maps" and `PLAN.md` warns that "a lit, shaded model library is a different
renderer budget". Converting the library to `KHR_materials_unlit` offline means
Tier 2's figures render under the **same zero-light budget Tier 1 already
measured**, with the flat stylised look these packs are drawn for anyway. It turns
`PLAN.md`'s open question into a build-step flag.

---

## 6. VFX for auras and spells without models

The auras the task names — Quantum Reduction and Robotics Mastery on the enchanted
creature, plus the stack resolving visibly — are mostly *not* a model problem.
Tier 1 already ships glow, ring, beam, particles, text, plate and a dissolve
shader as a fixed pool of 26 meshes (`effects.ts`), capped at 8 live and bound from
the one `useFrame`. Tier 2's job is to aim them at a figure instead of a quad, plus
three additions:

| Want | Cheapest implementation | Cost | Licence |
|---|---|---|---|
| **A per-card aura on the enchanted creature** | a **fresnel rim** shader on a duplicated, slightly-inflated copy of the figure's mesh: `pow(1.0 - dot(N, V), k)` × colour, additive, `depthWrite:false`, with a scrolling noise texture for the "circuit trace" and "quantum collapse" looks | +1 draw call per aura'd creature; the noise texture is the same runtime-generated canvas trick `effects.ts` already uses for glow/ring/dot | ours, GPL |
| Per-card aura variation | one shader, **parameterised from `cues.json`** — colour, scroll speed, noise scale, rim power. A unique aura per card is then a data row, not a shader | free | ours |
| **Richer particle systems** (the ant swarm, the Helicarrier downwash) | **three.quarks** — `web:` npm **0.17.1, MIT**, peer `three >= 0.182.0` (we run 0.186.0), one dependency (`quarks.core`); `measured:` unpacked **1,211,677 B / 77 files**. Repo MIT, pushed **2026-05-21**, 1,034 ★ | an unmeasured addition to the lazy arena chunk (currently 274 kB gz) | MIT |
| Sprite-sheet flipbooks (explosions, muzzle flashes, smoke) | **Kenney Particle Pack** — `web:` CC0, 80 sprites at 512², `measured:` **15,001,764 B** zip; plus his *Smoke Particles*, *Splat Pack*, *Light Masks* | one texture + UV offset animation on the existing plate primitive; `gltf-transform`-free | CC0 |
| **True bloom** | `@react-three/postprocessing` — `web:` **2.19.1, MIT**, peers `react ^18.0`, `@react-three/fiber ^8.0`, `three >= 0.138.0` (the React-18 line, as §9.2 rule 5 already identified); deps `postprocessing ^6.32.1`, `n8ao`, `maath`, `buffer`, `three-stdlib`. `measured:` unpacked **1,354,264 B / 235 files**. `postprocessing@6.39.5` is **Zlib**-licensed with peer `three >= 0.168.0 < 0.187.0` — 0.186.0 is in range, 0.187 would break it | a full-screen pass on an iGPU: the single most expensive thing on this list. Default **off**, as §9.2 rule 5 says | MIT + Zlib |

Note the version ceiling: `@react-three/postprocessing@3.1.1` is latest but targets
the fiber-9 / React-19 line. **2.19.1 is the version for this tree**, which is
exactly what report 09 §12.2 said a year of releases ago; that is now verified
rather than assumed.

`inferred:` the ordering for a first Tier 2 evening is *fresnel-rim aura shader
first* (it is ~30 lines of GLSL and reuses the whole existing pool discipline),
*three.quarks only if hand-rolled `Points` visibly fails*, *bloom last and behind a
flag*.

---

## 7. Lands as terrain tiles

Four land cards (Plains, Island, Thriving Heath, Thriving Isle) and, `measured:`,
up to **21 land permanents** on the table at once. Two routes:

**(a) A tile pack — recommended.** `measured:` Kenney's Hexagon Kit GLBs are
absurdly cheap: `grass.glb` **4,680 B / 32 triangles**, `water.glb` 3,468 B,
`sand.glb` 4,656 B, `stone.glb` 4,656 B, `water-island.glb` 9,800 B,
`river-straight.glb` 11,168 B, all sharing one 512² colormap. 21 tiles at 32
triangles is **672 triangles** and — via `<Instances>`, since tiles are rigid and
identical — **one draw call per tile type**. Plains → `grass`, Island → `water`,
Thriving Heath → `grass-hill`, Thriving Isle → `water-island`. The tile sits *under*
the land card's placement, so `land.rise` and `fx.ripple` keep working exactly as
they do now; the tile rises with the card.

**(b) Procedural.** An extruded hex or rounded rect with a noise displacement
(three ships `examples/jsm/math/ImprovedNoise.js`, 3,034 B) and, for Islands, an
animated water surface. `measured:` three ships `objects/Water.js` (12,894 B) and
`Water2.js` (10,459 B) — but **the npm `three` package contains only
`examples/jsm`; there is no `examples/textures`**, and `Water.js` requires a
`waterNormals` texture the caller must supply. A scrolling normal map generated
into a canvas (the `effects.ts` pattern again) or a CC0 one from ambientCG closes
that. drei's `MeshReflectorMaterial` is present if a mirror-ish island is wanted,
at real cost (it renders to a target).

`inferred:` **(a) for the first pass, (b) only if the hex silhouette fights the
card grid.** Report 09 §3.1's table is a rectangular rank layout, and a hex tile
under a rectangular card may read oddly; Kenney's kit has no square tile, whereas
an extruded rounded rect with a noise-displaced top is about twenty lines of
`BufferGeometry`. This is the one place where procedural may genuinely win, and it
is a look decision, not a technical one.

---

## 8. Recommended stack for Tier 2

Everything here is **CC0 or MIT/Zlib**, and every asset in it may be committed to
the public repository.

### 8.1 Assets — the library, and its total size

| Role | Asset | Source | Licence | Size |
|---|---|---|---|---:|
| human agent / hero / scientist / Soldier token | **Kenney Mini Characters** (12 characters, 32 clips, 723 tris, 7 joints) | kenney.nl | CC0 | 2,403,059 B zip; **246,916 B** per GLB |
| alternative agent look | **Quaternius "Man in Suit"** (11 clips incl. Punch/Death) | poly.pizza `/m/mQnGoME1ez` | CC0 | **583,416 B** GLB |
| robot / drone (Aerial Doombot) | **Quaternius "Robot Enemy Flying"** (Idle/Attack/Shoot/Dead) | poly.pizza `/m/lF3jeRJwiH` | CC0 | **298,324 B** GLB |
| insect (Flying Ant) | **Quaternius "Bee Enemy"** (Flying/Bite_Front/HitRecieve/Death) | poly.pizza `/m/6HsU6GQt3a` | CC0 | **193,200 B** GLB |
| extra clips, if the packs fall short | **Quaternius Universal Animation Library 1 + 2** (250+ clips, GLB, Mixamo-compatible rig) | quaternius.itch.io | CC0 | 15 MB + 17 MB zips |
| lands | **Kenney Hexagon Kit** — `grass`, `water`, `grass-hill`, `water-island` | kenney.nl | CC0 | 2,448,931 B zip; **4,680 B** per tile |
| VFX sprites | **Kenney Particle Pack** (+ Smoke Particles, Light Masks) | kenney.nl | CC0 | 15,001,764 B zip |
| props (lab bench, Helicarrier deck) | **KayKit Space Base Bits** / Quaternius Sci-Fi Essentials | itch.io | CC0 | 5.2 MB / 159 MB |

**Committed footprint after the build step:** four figure GLBs + four tiles + one
shared colormap, merged into **one `figures.glb` and one `tiles.glb`**, which
`inferred:` lands in the **1.5–3 MB** range before Meshopt and well under 1 MB
after. For comparison, §9.1 already budgets ~2.05 MB of first-load *card* JPEGs.
The zips themselves are **not** committed — only the extracted, optimised GLBs,
with a `tools/` script recording which pack, which version, which licence badge and
which date each came from.

### 8.2 Tooling

| Tool | Version | Licence | Role |
|---|---|---|---|
| `@gltf-transform/cli` | 4.5.0 | MIT | the whole offline pipeline: `prune dedup palette join weld unlit resample merge meshopt inspect` |
| FBX2glTF | binary v0.9.7 (repo pushed 2026-03-27) | BSD-3-Clause | the FBX-only packs (Quaternius *Ultimate Animated Character Pack*, *LowPoly Robot*) |
| Blender (headless) | 5.2 LTS | GPL | the FBX2glTF fallback, and the only route for retargeting UAL clips onto a different rig |
| `three` GLTFLoader + `MeshoptDecoder` | 0.186.0 (installed) | MIT | runtime load. **Not** drei's `useGLTF` with Draco unless `setDecoderPath` is called first |
| `SkeletonUtils.clone` | 0.186.0 (installed) | MIT | per-figure instances |
| three.quarks | 0.17.1 | MIT | *only if* hand-rolled `Points` proves insufficient |
| `@react-three/postprocessing` | **2.19.1** (not 3.x) | MIT (+ Zlib for `postprocessing`) | bloom, default off |

### 8.3 The five architectural commitments this implies

1. **One merged library GLB, loaded lazily, parsed once** — not one fetch per
   creature.
2. **Mixers live in `rigs.ts` and are advanced by `CueRunner`'s single
   `useFrame`.** Do not use drei's `useAnimations`.
3. **A cue owns clip *time*, not clip deltas** (`AnimationAction.time` /
   `mixer.setTime`), so skip, scrub and `flushAndSnap()` keep working by
   construction, and "identity" for a figure means "its idle action".
4. **Idles do not force `frameloop: 'always'`** — freeze figures when the queue is
   empty, or tick them at 10–15 Hz.
5. **Figures are never raycast targets.** `HitProxy` stays the only clickable thing,
   parked at the resting pose.

And one process commitment: **`replay-cues.test.ts` already prints a per-card and
per-archetype census over all eighteen recordings on every run.** A Tier 2 model
that is never resolved will say so there on the day it is added — the same net that
caught Coulson's badge firing zero times. Add a "figures by archetype" line to it
before adding the second model, not after the eighth.

---

## 9. What must stay local — the bucket, restated and extended

`web:` `.gitignore` already carries `web/public/art.json` with the comment
*"written by tools/fetch-art.ts from Scryfall; regenerate, never commit"*, and
`NOTICE` §2 records the Scryfall terms. Tier 2 adds four kinds of file to that same
bucket, for four different reasons:

| Artefact | Why it cannot be committed |
|---|---|
| **Anything generated from a Marvel card's art** — an image-to-3D mesh, a baked texture, a photogrammetry-style scan | It is a derivative of art licensed to Wizards by Marvel. `web:` Fan Content Policy: *"If you don't have the rights to use another person's stuff in your Fan Content—don't."* And the generator's own grant is conditioned on non-infringing input |
| **Mixamo `.fbx` / converted `.glb` clips and characters** | `web:` "Any type of free distribution of character or animation raw files" is listed under NO; Adobe ToU §6.2 forbids sublicensing. A GPL source distribution containing them would be a licence we cannot grant |
| **Quaternius packs badged QAL** (today: *Bestiary*) | `web:` QAL §3(a) forbids redistributing the assets as assets "regardless of how much the Assets have been modified" |
| **Sketchfab Standard/Editorial models** | `web:` the Store licence forbids letting others access the asset "as a stand-alone file"; Editorial additionally forbids commercial/promotional use |

`inferred:` the mechanism is the one that already works — a gitignored
`web/public/models/local/` beside the committed `web/public/models/`, a loader that
prefers the local path if present and silently falls back to the committed CC0
figure if not (the same "missing image renders a text card and never blocks a
click" discipline), and a line in `NOTICE` for every CC0 pack that *is* committed,
naming the pack, the version, the licence badge and the download date.

---

## 10. Risks, and the things only the user can decide

**Risks.**

- **Licence drift at the source.** Quaternius changed its licence 16 days ago and
  81 of its 83 CC0 badges could follow. The mitigation is a `tools/` manifest
  recording pack + version + badge + date at download time, so that the evidence
  survives the web page changing.
- **Mixamo may simply stop.** `web:` its FAQ has not been updated since 2021 and
  outage reports run through 2026. Do not make it load-bearing; the CC0 clip
  libraries are the answer.
- **The §9.1 triangle budget is void the moment a figure appears** and must be
  consciously reset, not silently exceeded.
- **The draw-call budget is genuinely tight at 21 figures** and depends on an
  offline `palette`+`join` step that nobody will remember to re-run. It belongs in
  a script under `tools/`, checked by an `inspect` assertion, not in a README.
- **`frameloop: 'demand'` is the largest thing Tier 2 can accidentally destroy.**
- **Cue creep, again.** §13 flagged it for Tier 1 and it was right. Tier 2 has a
  *model* per archetype and a *clip mapping* per cue: two new axes to fiddle with,
  both of which are data.

**Only the user can decide.**

1. **The look.** Blocky (Kenney, 72 triangles, unmistakably a toy) versus mini
   (Kenney, skinned, 723 triangles, still a toy) versus Quaternius (2–4.5k
   triangles, a stylised human). This is an aesthetic call about whether the
   S.H.I.E.L.D. deck should look like a diorama or like a cartoon, and no amount of
   measurement settles it. `arena-mode.md`'s phrase is *"creatures appear as
   holograms between them"* — a hologram treatment (additive, tinted, fresnel-rimmed)
   flatters the blocky end and is cheapest.
2. **Whether figures replace the cards or stand beside them.** Tier 1's entire
   layout is cards-as-quads. A figure *on top of* its card keeps every existing cue,
   every hit proxy and every camera shot working. A figure *instead of* the card is a
   different game.
3. **Whether to spend an evening on the local TripoSR + UniRig pipeline at all.**
   It is MIT end to end and this GPU can just about run it — but §4.3 means its
   output can never be committed, so it buys a *personal* Tier 3, not a shared one.
4. **Whether bloom goes on.** It is the one item on the list that could cost the
   frame budget outright, and it is the one that would make the holograms sing.
5. **Hex tiles or procedural slabs for the lands** (§7).
