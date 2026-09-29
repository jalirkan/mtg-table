# GPU day — swapping the GTX 1080 for the RTX 5070 Ti Super

*Written 2026-09-29, before the card arrived. Every fact about this machine below
was read off it that day, and the commands that read it are the ones in step 1.
Every fact about the new card is checked on the day, and each step says how.*

This is the day's guide, in order. Two labels on every step:

- **[you, sudo]** — a step you type yourself. It asks for your password, and
  Claude never types one.
- **[no sudo]** — anyone may run it. Run it from the main checkout,
  `/home/justin-a/code/mtg-table`, unless the step says otherwise.

**What the GPU is used for here, and what it is not.** Forge, the bridge, the
gate and the game itself run on the CPU. `./tools/check-all.sh` runs no GPU code,
and its relief tests ask for the CPU by name. The GPU is used in five places:

- your browser, drawing the arena and the workshop;
- `tools/arena-bench.mjs --gpu gl`, and `tools/personal/check.mjs --gpu gl` (both
  default to SwiftShader, which runs on the CPU);
- the likeness experiment's Python venv, `var/likeness/`;
- `tools/personal/relief.mjs`'s depth step, which runs in that venv.

**Two things break if you skip a step:**

1. **The driver.** The package installed today uses NVIDIA's *proprietary*
   kernel module. NVIDIA drives its Blackwell cards, the RTX 50 series, only with
   its *open* kernel modules: the packages whose names end in `-open` (step 2).
2. **The likeness venv's torch.** `torch 2.14.0+cu126` carries GPU code for
   `sm_50` to `sm_90` only. The new card is `sm_120` (compute capability 12.0),
   and CUDA 12.8 is the first CUDA that can build code for it. The venv's torch
   has to be replaced before it runs anything on the new card (step 3).

## Where things stand today (2026-09-29)

| what | today |
|---|---|
| card | NVIDIA GeForce GTX 1080: 8,192 MiB, a 200 W power limit, PCI id `10de:1b80` |
| driver | 580.178.04, from the package `nvidia-driver-580-server`, with the proprietary kernel module (`modinfo nvidia` reports the licence as `NVIDIA`) |
| kernel module | Ubuntu's prebuilt and signed `linux-modules-nvidia-580-server-generic-hwe-24.04`, for the HWE kernel `7.0.0-34-generic` |
| system | Ubuntu 24.04.5 LTS, Secure Boot **enabled**, an X11 desktop under `gdm3` |
| `nvidia-smi`'s "CUDA Version" | 13.0: the newest CUDA this driver can run, not an installed toolkit |
| `nvcc` | none (`which nvcc` finds nothing) |
| Ubuntu's own `nvidia-cuda-toolkit` | 12.0.140 in the archive (`apt-cache policy nvidia-cuda-toolkit`) |
| the likeness venv | `var/likeness/venv` in the main checkout: Python 3.12.3, `torch 2.14.0+cu126` and `torchvision 0.29.0+cu126` (arch list `sm_50 sm_60 sm_70 sm_75 sm_80 sm_86 sm_90`); torch's metadata requires `cuda-toolkit[…]==12.6.3` |
| the likeness scripts | `tools/likeness/`, never committed: they sit untracked in the `mtg-table-t2k` worktree, beside `docs/evidence/likeness-experiment.md` |

**Where the likeness venv came from.** It was created in the `mtg-table-t2k`
worktree and later moved to the main checkout. Its `bin/pip` launcher still names
the old path, so every pip command below is `$PY -m pip`, never `pip`.

## 1. Before you swap the card

**(a) Record what is there** [no sudo]. These commands write only under
`var/gpu-day/`, which is gitignored like the rest of `var/`.

```bash
cd /home/justin-a/code/mtg-table
mkdir -p var/gpu-day
nvidia-smi                                   > var/gpu-day/before-nvidia-smi.txt
nvidia-smi --query-gpu=name,memory.total,driver_version,vbios_version,pci.device_id,power.limit \
    --format=csv                            >> var/gpu-day/before-nvidia-smi.txt
mokutil --sb-state                          >> var/gpu-day/before-nvidia-smi.txt
dpkg -l | grep -E '^ii +(nvidia|libnvidia|linux-modules-nvidia|linux-signatures-nvidia)' \
                                             > var/gpu-day/before-packages.txt
ubuntu-drivers list                          > var/gpu-day/before-ubuntu-drivers.txt 2>/dev/null
```

`before-packages.txt` is what step 6 reinstalls if you ever put the 1080 back.

Record the venv's packages too. The first block sets the same cache pins as
`tools/likeness/env.sh`, so pip and torch write nothing outside `var/likeness/`.
Every later venv step assumes these variables are set; set them again in any new
terminal.

```bash
cd /home/justin-a/code/mtg-table
export LIKENESS=$PWD/var/likeness
export PIP_CACHE_DIR=$LIKENESS/cache/pip PIP_DISABLE_PIP_VERSION_CHECK=1 PYTHONNOUSERSITE=1 \
       XDG_CACHE_HOME=$LIKENESS/cache/xdg TORCH_HOME=$LIKENESS/cache/torch HF_HOME=$LIKENESS/cache/hf \
       CUDA_CACHE_PATH=$LIKENESS/cache/cuda TMPDIR=$LIKENESS/tmp
PY=$LIKENESS/venv/bin/python
$PY -m pip freeze > var/gpu-day/before-likeness-pip-freeze.txt
```

**(b) Back up nothing else.** Swapping a card does not touch the disk:

- the repository is in git;
- `var/` (the card library, the relief maps, the likeness venv and its weights)
  and `personal/` stay where they are;
- `~/forge` and `~/.forge` are not involved, and nothing in this guide writes
  there.

**(c) Do not install the new driver while the 1080 is still in.** The `-open`
modules do not drive a GTX 1080: `nvidia-driver-580-open`'s device list does not
name `10de:1b80`. Installing one first would leave the old card with no driver.

**(d) The hardware.** Power off completely and unplug the machine.

1. Check the new card's manual for its power connector (RTX 50 cards generally
   use the 16-pin 12V-2x6) and for the power supply it recommends. The 1080's
   limit is 200 W, and a card of this class draws more.
2. Fit the card.
3. Plug the monitor into the new card.

## 2. After the swap: the driver

**The first boot.** The old package's module cannot drive the new card. The
desktop comes up either on the firmware's basic display (low resolution, one
monitor) or as a black screen. In both cases **Ctrl+Alt+F3** gives a text login,
and every step below works from there.

1. Refresh the package lists [you, sudo]:

   ```bash
   sudo apt update
   ```

2. Find the card and the drivers that know it [no sudo]:

   ```bash
   lspci -nn -d 10de: | grep -iE 'vga|3d'   # the card; its id is the 4 hex digits after "10de:"
   ubuntu-drivers devices                   # every driver that lists this card; one says "recommended"
   ubuntu-drivers list                      # each driver, and which package provides its kernel module
   ```

   **Pick the recommended number, `<N>`, in its `-open` flavour:
   `nvidia-driver-<N>-open`.** If the recommended package has no `-open` in its
   name, take the `-open` package with the same number. Do not hardcode a number
   from anywhere else, this guide included. On 2026-09-29 the archive offered
   `-open` drivers 580, 595 and 610, each listing 21–22 RTX 50 device ids, but
   the new card's own id is known only once it is in the machine.

   Before installing, check two things [no sudo]. Put your card's id where it
   says `<id>`; `grep -i` ignores its case.

   ```bash
   apt-cache show nvidia-driver-<N>-open | grep '^Modaliases' | grep -ci 'd0000<id>'  # not 0: this driver lists your card
   apt-cache policy linux-modules-nvidia-<N>-open-generic-hwe-24.04                   # a Candidate: a prebuilt, signed module exists
   ```

3. Install the driver [you, sudo]:

   ```bash
   sudo apt install nvidia-driver-<N>-open linux-modules-nvidia-<N>-open-generic-hwe-24.04
   ```

   apt lists what it will **remove**. The `nvidia-driver-580-server` family
   should be on that list, and nothing else of yours. Answer `Y` only if that is
   so.

   Naming the `linux-modules-…` package keeps apt on Ubuntu's prebuilt, signed
   kernel module, which is what is installed today. Without it apt may choose
   `nvidia-dkms-<N>-open` instead. DKMS compiles the module on your machine, and
   with Secure Boot on it then asks you to enrol a key: you set a password now,
   and at the next boot a blue "MOK management" screen appears. Choose
   *Enroll MOK* → *Continue* → *Yes*, then type that password. Both ways work;
   the prebuilt one has no extra screen.

   `sudo ubuntu-drivers install` does the same job in one line, prebuilt module
   included where there is one. Use it only if the recommended package is an
   `-open` one.

4. Reboot [you, sudo]:

   ```bash
   sudo reboot
   ```

5. Confirm the card and the driver [no sudo]:

   ```bash
   nvidia-smi                                    # the new card's name, its memory (close to 24,576 MiB), the driver
   modinfo nvidia | grep -E '^(version|license)' # license: Dual MIT/GPL is the open module (today's reads NVIDIA)
   nvidia-smi --query-gpu=name,memory.total,driver_version,pci.device_id,power.limit \
       --format=csv > var/gpu-day/after-nvidia-smi.txt
   ```

## 3. The venv's torch, then the CUDA compiler (`nvcc`)

Nothing in the game needs `nvcc`. It is for the likeness experiment: Hunyuan3D-2's
texture stage builds a CUDA rasteriser, `hy3dgen/texgen/custom_rasterizer`, which
is a `CUDAExtension` and needs `nvcc`. The compiler has to match the torch it
builds for, so torch comes first.

### 3.0 Replace the venv's torch [no sudo]

Set the variables from step 1 first. Look at the torch you have:

```bash
$PY -c "import torch; print(torch.__version__, torch.version.cuda, torch.cuda.get_arch_list())"
```

The likeness install report, `var/likeness/INSTALL.md`, recorded `2.14.0+cu126`,
CUDA 12.6 and an arch list that ends at `sm_90`, with no `compute_*` entry. So
this torch carries no code the new card can run, and its first GPU kernel there is
expected to fail with *"no kernel image is available for execution on the
device"*. (This guide did not run torch in that venv; the report and torch's own
metadata are the evidence.)

Replace it with a CUDA 13 build.

- **Which index.** When the likeness experiment read the PyTorch index on
  2026-09-27, it offered torch 2.14 as `cu126`, `cu130` and `cu132` (its evidence
  §1). Check again on the day.
- **Which build.** Take the one whose CUDA version is not above the "CUDA
  Version" in `nvidia-smi`'s header.
- **The cost.** The download is a few GB, and it lands in
  `var/likeness/cache/pip`. The old `nvidia-*-cu12` wheels stay installed beside
  the new ones: a few GB of disk, and harmless.

```bash
$PY -m pip install "torch==2.14.0+cu130" "torchvision==0.29.0+cu130" \
    --index-url https://download.pytorch.org/whl/cu130
$PY -m pip check                     # gpytoolbox's two conservative pins are known and harmless
$PY -c "import torch; print(torch.__version__, torch.version.cuda, torch.cuda.get_arch_list()); \
print(torch.cuda.get_device_name(0), torch.cuda.get_device_capability(0)); \
x = torch.randn(4096, 4096, device='cuda'); print((x @ x).float().abs().mean().item())"
```

What to look for: `sm_120` in the arch list, capability `(12, 0)`, and a number
at the end rather than an error.

SF3D's and SPAR3D's compiled extensions in `var/likeness/ext/` were built against
the old torch. Move them aside, and the next run of those routes rebuilds them
(a minute or two each):

```bash
mv var/likeness/ext var/likeness/ext.cu126
```

### 3.1 Which `nvcc`

The compiler must be the CUDA version torch was built with. torch refuses to
build an extension with a CUDA major version other than its own. Read the
version off torch's own requirements:

```bash
grep '^Requires-Dist: cuda-toolkit' var/likeness/venv/lib/python3.12/site-packages/torch-*.dist-info/METADATA
```

- **Today (the `cu126` build)** that line pins `cuda-toolkit[…]==12.6.3`. Its
  `nvcc` is the `nvidia-cuda-nvcc-cu12` wheel, 12.6.85. That wheel is moot on the
  new card: CUDA 12.6 cannot build for `sm_120`, and the torch beside it cannot
  run there.
- **After 3.0** the line names a 13.x version, and that version is the one to
  install.

### 3.2 Route one: the pip wheel, into the venv [no sudo] — recommended

The `nvcc` extra of NVIDIA's `cuda-toolkit` package picks the right compiler
wheel for whichever torch you have. For the `cu126` build it is the
`nvidia-cuda-nvcc-cu12` wheel.

```bash
$PY -m pip install "cuda-toolkit[nvcc]==<the version the grep printed>"
NVCC=$(find var/likeness/venv -name nvcc -type f -perm -u+x | head -1); echo "$NVCC"
export CUDA_HOME=$(dirname "$(dirname "$NVCC")") PATH="$(dirname "$NVCC"):$PATH"
```

Everything stays inside `var/likeness/venv`. The wheels can spread CUDA's
headers over several folders under `site-packages/nvidia/`. If a build stops on a
missing `cuda_runtime.h`, find the folder with
`find var/likeness/venv -name cuda_runtime.h` and add it to `CPATH`.

### 3.3 Route two: apt [you, sudo]

Ubuntu's own `nvidia-cuda-toolkit` is CUDA 12.0.140 on 24.04. That is too old to
build for the new card and is not torch's version, so do not use it.

The apt route that works is **NVIDIA's own CUDA repository for Ubuntu 24.04**.
NVIDIA's CUDA download page (Linux → x86_64 → Ubuntu → 24.04 → deb (network))
prints the exact commands on the day:

1. install its `cuda-keyring` package, which adds an apt source to the system;
2. `sudo apt update`;
3. `sudo apt install cuda-toolkit-<major>-<minor>`, with torch's version.

It puts one conventional tree at `/usr/local/cuda-<major>.<minor>`, which torch
finds once you run
`export CUDA_HOME=/usr/local/cuda-<major>.<minor> PATH=/usr/local/cuda-<major>.<minor>/bin:$PATH`.
It is tidier for builds; the pip route keeps everything in `var/`. Pick one.

### 3.4 Check the compiler (either route) [no sudo]

```bash
nvcc --version            # "release 13.x": the same major version as torch.version.cuda
$PY -c "import torch; from torch.utils.cpp_extension import CUDA_HOME; print(torch.cuda.is_available(), torch.version.cuda, CUDA_HOME)"
```

The end-to-end check below compiles one tiny CUDA kernel against torch and runs
it on the card. It takes about a minute, and it builds under
`var/likeness/cache/`. It was not run on this machine, which has no `nvcc` today.

```bash
TORCH_EXTENSIONS_DIR=$LIKENESS/cache/torch_extensions TORCH_CUDA_ARCH_LIST=12.0 $PY - <<'EOF'
import torch
from torch.utils.cpp_extension import load_inline
cuda = """
__global__ void add_one(float* x, int n) { int i = threadIdx.x; if (i < n) x[i] += 1.0f; }
torch::Tensor bump(torch::Tensor x) { add_one<<<1, 32>>>(x.data_ptr<float>(), x.numel()); return x; }
"""
m = load_inline("gpu_day_probe", cpp_sources="torch::Tensor bump(torch::Tensor x);",
                cuda_sources=cuda, functions=["bump"])
print(m.bump(torch.zeros(4, device="cuda")))   # tensor([1., 1., 1., 1.], device='cuda:0')
EOF
```

## 4. What to run again, and what changes

**Rejoin the likeness scripts and the venv first.** `tools/likeness/env.sh` and
its scripts read `var/likeness/` from the directory you run them in. Today the
scripts are in `mtg-table-t2k` and the venv, weights and outputs are in the main
checkout. One symlink puts them back together without copying 13 GiB. Then
work from `mtg-table-t2k`'s root, where `env.sh` expects to be sourced.

```bash
ln -s /home/justin-a/code/mtg-table/var/likeness /home/justin-a/code/mtg-table-t2k/var/likeness
cd /home/justin-a/code/mtg-table-t2k && source tools/likeness/env.sh
./tools/likeness/run_all.sh --dry-run
```

Running a route again is still the personal-only experiment you approved on
2026-09-27. Nothing it makes goes into the arena, the repository or a picture
shown to anyone without a new decision (**D54**, PLAN.md's Tier 3 note; the
personal tier's rules, **D190**).

| what | on the GTX 1080 (8 GB) | on the new card | run it again? |
|---|---|---|---|
| Forge, the bridge, the gate | CPU | the same | optional: `./tools/check-all.sh` as a sanity check, since it touches no GPU |
| the arena and the workshop in your browser | measured headless only | nothing to set; the resolution ladder and the bloom governor decide on their own | just play |
| `arena-bench.mjs --gpu gl` | GTX 1080 numbers in the evidence files listed below | new numbers | **yes**, into a new evidence file |
| `arena-bench.mjs` on SwiftShader | a software rasteriser on the CPU | unchanged | no |
| the relief maps | depth ~30 ms a card on the GPU | the maps stay as they are: the device is not part of the recipe (`relief.mjs`'s `recipeOf`) | no |
| likeness route A (depth relief) and B (TripoSR) | fit easily: process peaks of 1,544 and 4,156 MiB | faster, same output; with `nvcc`, TripoSR's real `torchmcubes` could replace the CPU shim (1.3–1.5 s a card) | optional |
| route C (SF3D) and D (SPAR3D) | **ran out of memory in upstream's bf16**: the 1080 has no memory-efficient attention kernel for bf16, so the math kernel built a 5–6 GiB matrix. They ran in fp32 with the image encoder moved to the CPU (process peaks of 6,022 and 5,863 MiB), SPAR3D in its low-VRAM mode | bf16 is expected to fit: Ampere and later cards have that kernel, and 24 GB leaves room either way. Not measured yet | **yes**: `--precision bf16 --no-offload-encoder`, and for D also `--no-low-vram` |
| route E (Hunyuan3D-2 mini), shape | fp16, 463–510 s a card, an estimated 5 GB | faster | optional |
| route E's **texture stage** | impossible: no `nvcc` | step 3's `nvcc`, plus upstream's own figure of 16 GB for shape and texture together | **new work, not a flag**: build `custom_rasterizer` and `differentiable_renderer` from `var/likeness/src/Hunyuan3D-2/hy3dgen/texgen/`, download the paint model (`tencent/Hunyuan3D-2`, `hunyuan3d-paint-v2-0`) after reading that repository's own licence, as you did for route E, and write the call. `route_e_hunyuan_mini.py` makes shapes only |
| TRELLIS | not run: it wants 16 GB and CUDA extensions that need `nvcc` | possible | new work, never prepared: it pins its own versions, so it would get a venv of its own under `var/` |

Two things to expect from the table:

- **C and D will not look different.** The shapes came out flat because of what
  the models make of painted art (the likeness evidence, §12.2–§12.4), not because of
  the card. The card changes how fast they run and which settings fit.
- **Builds on the new card.** When you build Hunyuan's rasteriser or TripoSR's
  `torchmcubes`, set `CUDA_HOME` as in step 3.2 or 3.3 and export
  `TORCH_CUDA_ARCH_LIST=12.0`. Upstream's instruction is `python3 setup.py install`
  in each folder; `$PY -m pip install --no-build-isolation <folder>` does the same
  into the venv.

**The arena bench.** Build and serve the production app, then bench the busy
frame with bloom off and with it on:

```bash
npm --prefix web run build && npm --prefix web run preview -- --port 5182 &
node tools/arena-bench.mjs --index 316 --gpu gl --no-bloom   # draw calls and triangles are read with bloom off
node tools/arena-bench.mjs --index 316 --gpu gl --bloom
```

The report prints WebGL's renderer string, and it must name the new card: that
is what makes the number the new card's. The personal tier's line is benched
against a dev server with `--personal` (`docs/guides/personal-tier.md`, *The
budget*).

### The numbers the new card is compared against

The GPU pass (2026-09-29, `docs/evidence/gpu-pass.md`, D270–D272) benched the
whole arena on the GTX 1080 the day this guide was written. Run the same lines on
the new card, **on an idle machine** — the pass's machine was shared all day, and
the 1080's frame times swung 2–4× with the load and the driver's clocks (it was
seen at P5, 734 MHz, under full load) — and put the table in a new evidence file:

```bash
for spec in "g1.jsonl 316 4" "g1.jsonl 369 1" "villain-masters-of-evil-33.jsonl 388 4" "villain-wakanda-232.jsonl 477 4" "villain-doom-248.jsonl 342 4"; do
  set -- $spec
  for bloom in --no-bloom --bloom; do
    node tools/arena-bench.mjs --url "http://127.0.0.1:5182/?replay=games/$1#arena" \
      --index $2 --speed $3 --gpu gl $bloom --json "var/gpu-day/bench-${1%.jsonl}-$2$bloom.json"
  done
done
```

The GTX 1080's quietest series (production build of `e2c337c`, 09:26–09:40, load
4–10, render dpr 1 — `gpu-pass.md` §2.1; the pass's own build draws the same calls
and triangles):

| frame | bloom off: p50 · p95 ms | calls · triangles (bloom off) | bloom on: p50 · p95 ms |
|---|---|---|---|
| `g1` `--index 316` (the bench frame) | 0.5 · 0.7 | 87 · 26,395 | 0.6 · 1.6 |
| `g1` `--index 369 --speed 1` (its busiest combat) | 0.5 · 0.7 | 89 · 26,621 | 0.6 · 1.3 |
| Masters of Evil `--index 388` | 0.7 · 1.2 | 97 · 31,354 | 0.8 · 1.4 |
| Wakanda `--index 477` | 0.6 · 0.8 | 118 · 32,102 | 0.7 · 1.6 |
| Doom Legion `--index 342` | 0.6 · 0.8 | 124 · 36,914 | 0.6 · 2.0 |

Every one of these is inside report 09 §9.4 (p95 ≤ 20 ms) by ten times, so a new
card will not show a difference in the gate — look at p50 and at the frame count
(`frames` in the JSON: ~9,000 in five seconds at the bench frame with bloom off,
the loop unthrottled). Calls and triangles are the tree's, not the card's: the new
card must read the same (a different number means a different build, or a sample
that ended on another frame — the JSON's `endIndex`). SwiftShader's numbers do not
change with the card (D270: the software floor, p95 33–35 ms at the floor on every
tree). The CPU side does not change either: the pass's per-frame counts
(`updateMatrix` 984, `bufferSubData` 31, `Color.setStyle` 0 at the bench frame)
are the code's.

**The old numbers stay, as history.** Every GPU number in the evidence says the
GTX 1080 drew it, and it stays true of that card. These files carry the 1080's
frame times, draw calls or depth timings:

- `m7-tier2.md`, `m7-tier2-slice2.md`, `m7-tier2-slice3.md`,
  `m7-tier2-slice4.md` and `workshop.md`;
- `look.md`, `motion.md` and `bodies.md`;
- `personal-tier.md`, `status-layer.md`, `villain-identity.md`,
  `relief-window.md` and `gpu-pass.md` (the whole arena, 2026-09-29).

`spectate.md` names the card only as the machine. README's slice-1 cost table
and its bloom note are 1080 numbers too. Do not edit any of them: the day's
numbers go into a new, dated evidence file, and a sentence in README can point
to it. SwiftShader's numbers (`m7-arena.md` and the rest) do not change at all,
because the CPU draws them.

## 5. The personal tier: nothing changes

- The folder, the manifests, `check.json`, the dev route and the never-publish
  rule are all untouched.
- **The budgets stay** (`PERSONAL_TRI_CAP`, `PERSONAL_TABLE_TRIS` and the others
  in `web/src/arena/perf.ts`, D195 and D197). A bigger card is not a reason to
  raise them; changing one is a decision.
- **The relief maps stay current**, because the device is not part of a map's
  recipe.
- **One practical note.** `relief.mjs` runs its depth step in the likeness venv
  and picks the GPU when torch sees one. Between the swap and step 3.0, pass
  `--device cpu` (about 0.11–0.14 s a card). After 3.0, the default works again.
- The gate's relief tests already run on the CPU (`web/test/relief.test.ts`
  passes `device: 'cpu'`), so the swap does not affect them.

## 6. If the driver fails: getting back to a working desktop

1. **A black screen or a login loop.** Press **Ctrl+Alt+F3** for a text login.
   If even that fails, open GRUB's menu: hold **Shift** at power-on, or tap
   **Esc** on a UEFI machine. Choose *Advanced options for Ubuntu* → the
   *(recovery mode)* entry, then *network* (so apt can download), then *root*.
2. **Try another branch** [you, sudo]. `ubuntu-drivers devices` lists them.
   Install another `-open` number that lists your card, exactly as in step 2,
   then reboot.
3. **Remove the NVIDIA driver completely** [you, sudo]. The kernel's own drivers
   take over:

   ```bash
   sudo apt --purge remove '*nvidia*<N>*'    # every package of that branch, its kernel module included
   sudo reboot
   ```

   While NVIDIA's packages are installed they keep the open-source `nouveau`
   driver switched off; once they are gone it may load again. The desktop then
   comes up on `nouveau` or, if the kernel's `nouveau` cannot drive a card this
   new, on the firmware's basic display at a low resolution. Either is enough to
   try again.
4. **Go back to the GTX 1080.** Power off, swap the cards back and boot. The
   `-open` module ignores the 1080, so you get the basic display again. Then
   [you, sudo]:

   ```bash
   sudo apt install nvidia-driver-580-server linux-modules-nvidia-580-server-generic-hwe-24.04   # as var/gpu-day/before-packages.txt says
   sudo reboot
   nvidia-smi                                   # GeForce GTX 1080, driver 580.x
   ```

   The 1080 needs the 580 branch's proprietary module. On 2026-09-29 only
   `nvidia-driver-580` and `nvidia-driver-580-server` listed its id,
   `10de:1b80`; the `-open` packages and every branch after 580 did not.

   Put the venv back the same way [no sudo]. Set step 1's variables first.

   ```bash
   $PY -m pip install "torch==2.14.0+cu126" "torchvision==0.29.0+cu126" --index-url https://download.pytorch.org/whl/cu126
   mv var/likeness/ext var/likeness/ext.cu130 && mv var/likeness/ext.cu126 var/likeness/ext
   ```

   `var/gpu-day/before-likeness-pip-freeze.txt` is the full list to compare
   against.
