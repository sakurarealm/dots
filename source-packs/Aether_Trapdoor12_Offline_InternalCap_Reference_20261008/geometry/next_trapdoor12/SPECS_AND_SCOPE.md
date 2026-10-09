# Trapdoor12: conservative 72-to-56 component reference

This is an offline historical geometry reference from commit
0956b0777cf007a7a3b1ed799f7ade777f14c80d. It is not a finished production-art
asset, current native integration, a full accepted catalog block or a phone
test. No repository, registry ID, shader, pipeline or collision implementation
has been changed. Independent review is pending.

## Real catalog and shape contract

The actual 645-name catalog maps only spruce_trapdoor (tex532),
dark_oak_trapdoor (tex537) and iron_trapdoor (tex665) to shape12. The iron
reference uses the exact already approved iron v02 artwork, with no new art
approval. It does not approve either wood variant or their beam grain/tints.

Historical shape12 is a 3/16m-thick framed cross with four 5/16m square holes.
Six render boxes form four borders and two crossing bars. This is distinct
from lattice19's 1/8m-thick seven-box construction; their source contracts and
collision definitions are not interchangeable.

The sixteen actual metadata endpoints use facing bits0-1, upper bit2 and open
bit3. Closed geometry ignores facing and occupies Y=0..0.1875 or
0.8125..1. Open geometry ignores upper and sits against its facing cell edge.
There are six distinct occupancies. Duplicate closed/open metadata records
remain explicit for state checking, not sixteen different silhouettes.

## Conservative useful geometric reduction

Original six-box rendering costs 72 triangles. Eight whole component caps are
completely backed by another box on the outward side. Omitting those caps
gives 56 triangles, saving16 (22.2222%). Every retained face keeps its original
corners, normals, UV values and triangles. No coplanar retriangulation,
cross-cell greedy proxy, neighbour boundary culling, hole filling or arbitrary
closure is introduced. There is one batched mesh per endpoint, one shared
material, and no renderer per component.

Partial border faces and original crossing-bar overlaps remain. Their
conspicuous dark centre patch is also present in the raw comparator and is a
disclosed limit of these diffuse-toon previews. Finished production-art
approval remains false. A future repair of those overlaps needs its own
surface/attribute/cost review; this package does not quietly repair them.

An exact-silhouette welded closed union has40 functional corners and four
through-holes; its triangle lower bound is92. It is more costly than both72
raw and56 cap-only. The candidate has open render components and is not a
closed union shell or an approved replacement MeshCollider.

## Actual saved data and export checks

The source contains36 target meshes:16 raw endpoints,16 candidate endpoints
and four raw/candidate closed/open comparison meshes, plus a preview-ground
helper. The two GLBs contain32 actual endpoint meshes, and candidate FBX
contains16 endpoint geometries. Atlas node placement is page staging, not
logical voxel placement or a runtime prefab.

Saved source and actual GLB arrays are decoded and self-checked. All16 actual
candidate GLB P/N/UV triangle sets are exact subsets of their corresponding raw
sets. Geometry dimensions, outward normals, exterior coverage, world2m UV and
original union occupancy are checked. The stored UV is an explanatory surface
projection; it is not native(texId,0) UV0 or an implemented native shader
adapter. Full per-vertex native attribute preservation remains unverified.

Each actual saved raw mesh has144 vertices and36 quads; each candidate has112
vertices and28 quads. Actual GLB POSITION accessors likewise contain144/112
vertices. The source check expands their triangles into216/168 checked corner
records. Those expanded records are not the saved mesh vertex-array length,
measured GPU allocations or a newly measured native runtime vertex count.

The guarded Blender roundtrip imports raw GLB16, candidate GLB16 and candidate
FBX16 for48 actual endpoint-format cases. Their source-frame corner hashes
match after checking the known1/16m grid and tiny import floating noise. FBX
may use a different quad diagonal; literal triangle equality across formats
is not claimed. These are maker checks, not independent Blender imports or
Unity/device testing. Reports record actual noise and artifact hashes.

The editable source packs the unchanged approved512 albedo and uses one
single-sided opaque metallic PBR bridge. GLBs embed the same actual512 bytes.
The mobile256 previews use the unchanged approved256 map. The FBX relative
albedo reference requires the included sibling materials_b tree; its
Phong/DiffuseColor serialization does not establish target native/Unity PBR
equivalence. Diffuse-toon previews do not verify native metallic behavior.

## Collision, interaction and native limits

The original historical VoxelVolume collider is one solid thin sheet of volume
0.1875m3, whereas the four-hole visible union occupies0.1142578125m3. The
0.0732421875m3 difference remains explicit. Rendering a hole does not establish
ray or character passage through the solid sheet. The original collider
reference is separate and unchanged; no collision is generated from the open
candidate render components. Chunk MeshCollider and VoxelVolume compound-box
paths must not inherit one another's approval.

Historical interaction supports a discrete Trapdoor open-bit toggle and uses
the original sheet boxes for body-overlap refusal. This reference creates
endpoint geometry only, without an animated hinge, pivot, continuous sweep,
current-version C# execution, body safety test, picking, save, dirty-region or
cross-chunk acceptance. Current native source must be checked separately.

The old metal family3 shader branch can bypass authored albedo. Its actual
configuration, native UV/ID/tint/world projection, pass/culling, neighbour face
occlusion and target-shader behavior remain unverified. The original native
neighbour-face rule is not replaced or used to remove extra boundary caps.

## Measured file cost and delivery bounds

Actual GLB distinct physical mesh ranges are74160 raw and57680 candidate
bytes, saving16480B (22.2222%). Per-mesh accessor-reference sums80640 and62720
repeat shared index data. Whole GLBs305080 and288872 bytes save16208B (5.3127%)
including the identical embedded material image and JSON. These are different
file metrics, not measured native/GPU allocations, draw calls or frame times.

Same-camera raw/candidate and512/256 image comparisons are recorded in
reports/trapdoor12-labeled-views-and-pixel-comparison.json. Near-identical
offline pixels do not establish unconditional native visual equivalence.
Labelled front, reverse-under,256 and closed/open comparison views accompany
the actual source/exports. The first cell-centred framing was preserved in a
separate revision folder and excluded from delivery; final pages centre on
actual geometric bounds without changing dimensions, normals or UV data.

New material artwork approvals0, finished_production_art_pass=false,
full_block_accepted=false, native_integrated=false, mobile_pass=false. All
Blender work uses the shared serial lock guard with two CPU threads,
MemAvailable>=3GiB and free disk>=2GiB. Reproduction scripts may need their
ROOT adjusted after relocation; no game source edit is supplied.
