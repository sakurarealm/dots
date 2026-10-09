Aether wooden barrel / composter production candidate

Scope: isolated editable Blender asset and portable FBX/GLB interchange. These are new offline candidates aligned to the historical approved warm-workbench visual. The current Unity project, native BK material routing, colliders, gameplay, and phone performance have not been tested. 1 unit = 1 metre; base-center pivot (0,0,0).

Shared wood: unchanged T_Wood_Warm_BaseColor.png (512 x 512) from aether_04_shared_resources_2026-10-07.zip. Both assets use the same M_Shared_WarmWood material definition; no new species texture claim and no duplicate meshes for colour variants.

Barrel source object: aether_wooden_barrel_v01. Named component vertex groups keep staves, hoops, rivets, lid boards editable inside one runtime mesh. Materials: M_Shared_WarmWood and M_Shared_MatteIron. Shader-node paths: material.node_tree.nodes['Shared_Source_Albedo'].image (wood), material.node_tree.nodes['Principled BSDF'].inputs['Base Color'] (iron), ['Roughness'], ['Metallic']. Portable exported materials are Principled PBR; map these named slots to the desired game cel shader. Preview lighting is not Unity shader validation.

Rebuild in Blender 4.3.2:
/usr/bin/blender -b -t 2 --python scripts/build_assets.py -- --asset barrel --mode sample
/usr/bin/blender -b -t 2 --python scripts/build_assets.py -- --asset barrel --mode final

The builder guards >= 2 GiB available memory and >= 3 GiB free disk. One Blender process at a time, two threads. Run separate assets sequentially.

Recipe: recipes/assets.json. status.json and events.jsonl record actual completed stages and paths. Reports distinguish Blender mesh QA and export re-import checks from engine acceptance. UV0 is intentional repeated/overlapping wood mapping, not unique lightmap UVs.

Mobile LOD1 (1392 triangles vs 3000): run builder with --lod after --mode final. It removes per-stave chamfers, small rivets, and halves lid perimeter subdivisions, while keeping the 16-segment exterior profile and material/UV mapping formula. Four 512px geometric silhouette IoU checks = 99.7657%; matched retained-position UV difference = 0. These are geometry checks, not engine LOD transition acceptance.

Six-style comparison: scripts/render_six_styles.py uses the frozen sample source, unchanged geometry, UV0, camera, lights, exposure, and render sampling. styles/source/barrel_six_styles_library.blend contains ONE barrel mesh and twelve named material variants. It is not six new geometry assets. Every full-height albedo is actually replaced; shader art grouping, grain structure, roughness and iron response vary per approved recipe. Exact source-game shaders and tile/mobile/current-project acceptance are not claimed.

Do not overwrite source/aether_wooden_barrel_v01_sample.blend while comparing styles. Production .blend/FBX/GLB sources have unused UVMap removed; this leaves active UV0 unchanged.
