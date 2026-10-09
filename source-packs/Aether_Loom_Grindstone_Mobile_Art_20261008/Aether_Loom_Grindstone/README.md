# Aether functional props: loom and grindstone

Standalone editable art candidates, made in Blender 4.3.2. These files do not modify the Aether project. All reported acceptance is explicitly scoped to offline art and Blender checks.

## Two useful assets

- Grindstone: warm timber frame, 24-sided chamfered vertical grinding wheel, real axle/bearings, water tray, hand crank and operator tool rest. Rotation pivot groups wheel, axle, hubs and crank. Static frame is batched separately.
- Loom: floor-standing treadle loom with actual warp threads, reed, suspended heddle frame, swing beater, two foot treadles, a boat shuttle and moss-green cloth roll. Static frame, lift assembly and swing assembly are batched separately.

The file root is the centre of the structural base at floor level. Blender units are metres, Z up; the operator position is on negative Y. Mesh and material names are meaningful. `Action_Position` is a suggested dummy position, not tested character alignment or gameplay code.

## Delivery layout

`grindstone/final/` and `loom/final/` contain editable `.blend`, embedded-texture `.fbx`, embedded `.glb`, four 512px review angles, a 1024px hero, contact sheets, manifests and source/runtime mesh QA. `SOURCE_PARTS_EDITABLE` is hidden in the source file and preserves individual pieces; `ASSET` contains only the batched runtime meshes and useful empty pivots. Do not enable both collections in the same render or export.

`recipes/` states explicit sizes, budgets, part counts and functional anchors. `scripts/build_props.py` is the reusable builder. `scripts/verify_exports.py` checks Blender export/reimport. `assumptions.json` records the historical baseline and scope. `textures/` contains only recovered shared basecolors. The first grindstone sample and its directed review remain under `grindstone/sample/` and `grindstone/sample_review.json`.

## Styling and provenance

I inspected the approved workbench perspective render and read its image-only approval scope before building. Only three existing shared basecolors were recovered from `aether_04_shared_resources_2026-10-07.zip`: warm wood, moss canvas and matte brass. Texture SHA-256 and source archive entries are recorded in `reference/texture_provenance.json`. No image generation or third-party model reuse was needed.

The historical conventions support a warm, calm, flat-faceted, low-frequency hand-painted direction. Materials use portable Principled bridges for review. They are intended to adapt to cel shading; they do not reproduce or claim to validate the current Aether project shader. No outline geometry or high-resolution normal maps were added.

## Rebuild

From this directory, run one Blender process at a time after checking at least 2 GiB MemAvailable and 3 GiB disk space:

```
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 blender -b --factory-startup -t 2 --python-exit-code 1 --python scripts/build_props.py -- --asset grindstone --revision sample
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 blender -b --factory-startup -t 2 --python-exit-code 1 --python scripts/build_props.py -- --asset grindstone --revision final
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 blender -b --factory-startup -t 2 --python-exit-code 1 --python scripts/build_props.py -- --asset loom --revision final
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 blender -b --factory-startup -t 2 --python-exit-code 1 --python scripts/verify_exports.py
```

The builder overwrites its isolated asset outputs. Preserve user edits first. This Blender build has no OpenImageDenoise support, so renders use 64 CPU samples without denoising.

## Import and acceptance boundary

FBX uses forward -Z/up Y and unit scale 1. GLB uses its standard Y-up conversion. Validate orientation with a metre reference before project import. No Unity `.meta`, prefab, shader bindings, collider or LODGroup files are invented. Source pieces intentionally meet or overlap at joints; geometry QA is per closed component and runtime batching does not boolean-union joints.

Checked: finite coordinates, nonzero geometric and UV faces, closed component topology, positive signed component volumes, triangle counts, meaningful pivots, and the actual exported files via Blender reimport. See reports for observed results and exact bounds.

Not checked: latest user project rules, Unity import, project cel shader/HDRP lighting, texture compression, animation/IK, production logic, collision/navigation, or target-phone performance. Low triangle counts and batching are authored budgets, not measured mobile acceptance. Visual review is author inspection of actual Blender renders, not independent studio or runtime approval.
