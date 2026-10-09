# Trapdoor12 real remaining shape cost

Only spruce_trapdoor, dark_oak_trapdoor and iron_trapdoor map to historical
shape12 (tex532/537/665). This is a six-box 3/16m four-hole framed cross,
distinct from lattice19's seven-box 1/8m model. Sixteen actual metadata
endpoints produce six distinct occupancies: two closed heights (facing
ignored) plus four open edge planes (upper ignored).

The original six box stream costs72 triangles per endpoint. Omitting only
eight wholly backed component caps gives56 triangles, a16 triangle or22.222%
reduction. Kept faces retain their original triangles; no interpolation
retriangulation or cross-cell/neighbor culling is proposed. Partial border
faces and crossing-bar overlap remain. One batched mesh per reference state
is required, not six renderers. The derived P/N/UV triangle-stream estimate
6912 to5376B is arithmetic, not measured native/GPU memory or draw calls.

A complete welded exact-silhouette closed union needs at least92 triangles
for40 functional corners and four through-holes. It loses to both72 raw
and56 cap-only. Do not call closed-union reconstruction an optimization.

All16 states are self-checked against exact cap-backing and union-exterior
elementary rectangles with zero failures. These are CPU cost-study probes,
not generated blend/FBX/GLB, an independent review, finished art, native
integration, interaction or device evidence. No output model was generated.

Historical VoxelVolume still uses a solid thin sheet of volume0.1875m3;
the four-hole visible union occupies0.1142578125m3. The0.0732421875m3
difference does not mean an actual ray/character can traverse the render
holes. Chunk generated MeshCollider and VoxelVolume box behavior remain
different paths. Current revision and native neighbor-face culling are
unverified. Reusing approved iron or wood artwork would only be offline,
with metal albedo bypass and per-beam grain/tint/world-phase still open.
