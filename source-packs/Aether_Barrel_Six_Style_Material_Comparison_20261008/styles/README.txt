Six material art-direction comparisons on one frozen barrel

01 Genshin direction: clean broad ribbons, simplified grain, 3 hardish value groups
02 Arknights Endfield direction: finer fibers/weathering, continuous physical shading
03 Miyazaki / Ghibli direction: pigment washes, delicate washed contours, soft 2-zone grouping
04 BK provisional direction: angular chisel facets, polygonal knots, chunky 3-band grouping
05 Hand-painted oil direction: broken-color bristle marks, expressive mid-frequency brushwork
06 Bloomwalker direction: creamy opaque gouache groups, rounded grain and oval knots, soft 3-zone grouping

The material artwork is newly generated original comparison art. No source-game texture was extracted. These are art-direction studies, not certified matches to original shaders or the current game project. BK is provisional because its exact reference is not identified.

Controls: identical barrel geometry (3000 triangles), vertex positions, polygon topology, face material indices, active UV0, camera, lights, world, exposure, colour management and render sampling. Each result uses a real different 1254px full-square albedo, wood roughness and iron response. Proposed NdotL value-group nodes vary diffuse treatment; they do not change scene lights or bake illumination into the source image. The immutable geometry/UV signature and fixed scene signature are recorded per render.

Editing: source/barrel_six_styles_library.blend contains one barrel mesh and twelve named wood/iron materials. Choose an M_Style_<id>_Wood and matching M_Style_<id>_Iron for object material slots 0 and 1. Named node Shared_Source_Albedo holds each embedded image. The preview floor and lights are clearly marked and are not the asset mesh.

Reproduce with ../scripts/render_six_styles.py. The frozen baseline source is ../source/aether_wooden_barrel_v01_sample.blend. The recipe is styles/style-recipes.json. First run scripts/extract_style_sources.py with Blender to recover byte-identical packed PNGs into styles/textures, then scripts/render_six_styles.py. The library .blend itself is self-contained with embedded textures.

Remaining gaps: independent comparison review; texture cyclic wrap continuity; mobile-resolution derivatives; current native/BK shader routing; actual Unity import/runtime, colliders, game-camera LOD, and phone performance. Texture art is full-height once per body, not repeated vertically. Mobile acceptance is not claimed for the 1254px art masters.
