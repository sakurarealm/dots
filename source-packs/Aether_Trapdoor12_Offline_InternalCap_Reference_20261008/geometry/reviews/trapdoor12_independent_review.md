# Trapdoor12 independent review

Reviewed 2026-10-08 UTC. Result: **pass only as a limited offline historical
geometry reference**. This is not finished production art, a native asset,
a collision replacement, a full accepted block, or a phone pass.

The independent byte checks and source-contract tests pass. The conspicuous
black central crossing patch remains an explicit production-art blocker.

## Evidence actually inspected

- Current `geometry/next_trapdoor12`, not the quarantined first-framing revision
- `SPECS_AND_SCOPE.md`, six maker JSON reports, historical C# shape/state,
  physics and interaction definitions
- Saved `.blend` via a read-only SDNA parser, both GLBs via direct accessor
  decoding, and FBX via direct binary-node/array decoding
- All four complete labelled contact images: front 512, reverse-under, front
  256, and closed/open raw-versus-candidate
- Existing raw preview pixels, recomputed independently without new renders

No Blender process, import or render was run for this review. No Unity, Codex,
user computer, game-code edit or actual phone test was used. The maker's 48
guarded format/state imports remain maker evidence, not independent imports.

## Independent geometry findings

Historical `ChunkMeshGenerator.cs:964–1042` defines shape12 as six boxes,
3/16 m thick, with four 5/16 m square through-holes. The independent expected
boxes were written from those C# definitions, not taken from the maker's
snapshots or test expectations. Lattice19 is the different seven-box,
1/8 m-thick construction and does not inherit this result.

All sixteen metadata endpoint records match the source contract. Facing is
bits 0–1, upper is bit 2, and open is bit 3. Closed facing variants coincide;
open upper variants coincide. Six distinct occupied geometries remain.
Open states lie at +Z, -X, -Z or +X as specified. Closed bottom/top bounds are
Y=0..0.1875 and Y=0.8125..1.

The actual saved source contains 36 target meshes plus one preview-ground
helper. Source raw meshes have 144 saved vertices and 36 quads; candidates have
112 saved vertices and 28 quads. Their expanded triangle-corner counts are 216
and 168. The four comparison meshes match their corresponding endpoint mesh
data. Both GLBs contain 16 endpoint meshes each, with actual POSITION accessor
counts 144/112; candidate FBX contains 16 geometries and one material.

Every candidate GLB has 56 triangles versus 72 raw. For all 16 states, candidate
P/N/UV triangle **multisets are exact subsets** of raw, including multiplicity.
Source and GLB triangle multisets match. The removed sixteen triangles are
exactly eight whole original quads, each entirely backed on its outward side
by another original component. Independent partitioned-face coverage tests
confirm this; no boundary/neighbor cap, partial exposed face, hole or original
crossing overlap was silently removed. Retained triangles stay on the
original component faces with unchanged corners, outward normals and stored
2 m world-projection UV values.

An independent union grid, using one skew interior point per exposed tile,
produced 78 boundary samples per state and 1,248 candidate checks with zero
missing exterior coverage. Sixty-four hole-centre through-line tests found no
rendered hole closure. All source/GLB/FBX tests also found no wrong normals or
world-projection UV corners. These tests do not execute native shader UV0.

FBX has the same surface P/N/UV corner sets and source faces, but all 16 FBX
meshes use a different quad diagonal from the GLB. Literal cross-format
triangle equality is false and is not required or claimed. Its relative
albedo reference depends on the sibling `materials_b` tree. No target-import
or native PBR equivalence is established.

The candidate is deliberately an open component rendering, not a watertight
union shell: coordinate-welded triangle edges have 28 single-incidence and
four triple-incidence edges. Raw also retains four four-incidence overlap
edges. Neither is an independently approved MeshCollider. The 40 functional
corner, four-hole closed-union topology would require 92 triangles, so that
different construction is not a triangle-saving substitute for this 56-triangle
component reference.

## Materials, pictures and file cost

All 36 target source meshes share one material. Each GLB has one material,
single-sided and opaque. The packed source image and both actual embedded
GLB image payloads equal the existing approved iron v02 512 PNG byte-for-byte:

`c708e6c4930b561d10485d5294bb34d5763a8d43904489f3d1e5545282586d8f`

The 645-name historical catalog has only spruce_trapdoor, dark_oak_trapdoor and
iron_trapdoor mapped to shape12. This iron reference grants no wood/tint/grain
approval and no new artwork approval.

All four contacts show complete, centred geometry without clipping. The
four openings and thickness are visible. The centre is conspicuously black
on 512,256 and reverse-under views, and the same patch is visibly present in
the raw comparator. Near-identical offline pixels preserve this raw overlap
problem; they do not establish finished art quality or unconditional native
visual equivalence.

Independent pixel recomputation matches the maker report:

- Raw/candidate front RGB MAD 0.0000028610/255, maximum 4; four pixels differ
  by more than 2 in a channel
- Candidate 512/256 RGB MAD 0.0501951377/255, maximum 3; eleven pixels differ
  by more than 2 in a channel

Direct accessor range accounting distinguishes physical storage from repeated
references:

- Distinct physical mesh ranges:74,160→57,680 bytes;16,480 B saved,22.2222%
- Per-mesh accessor-reference sums:80,640→62,720 bytes, repeating shared
  index ranges
- Whole GLBs:305,080→288,872 bytes;16,208 B saved,5.3127%, including the
  identical 209,975-byte image payload and JSON/staging data

These are offline file metrics. They are not native/GPU allocations, runtime
vertex buffers, draw-call measurements or frame-time/phone measurements.

## Collision and remaining limits

The unchanged historical VoxelVolume physics reference is a solid sheet of
0.1875 m³. The independently calculated four-hole visual union is
0.1142578125 m³, leaving 0.0732421875 m³ of collision/visual difference.
Render holes do not prove ray or character passage. Chunk MeshCollider and
VoxelVolume compound-box approvals are separate.

Historical interaction is an open-bit endpoint toggle with original sheet
boxes used for body-overlap refusal. No animated hinge, pivot, continuous
sweep or current-version interaction safety was verified. Native attributes,
texId/tint/world projection, family 3 albedo bypass, shader passes/culling,
neighbor occlusion, picking, save/dirty-region/cross-chunk behavior and actual
phone performance all remain open.

During review, the maker corrected the misleading source report label
`serialized_vertices 216/168`: it now separates actual saved vertices 144/112,
quads 36/28 and expanded triangle corners 216/168. The existing roundtrip's
imported mesh vertex-array length was not recorded and is explicitly
unclaimed; it was not inferred from the export accessor count. Geometry,
exports and preview pixels were unchanged by this report-wording correction.

**Final bounds:** new material art approvals 0;
finished_production_art_pass=false; native_integrated=false;
full_block_accepted=false; mobile_pass=false.

Machine-readable evidence, artifact/report hashes and reproducible read-only
checks: `trapdoor12_independent_readonly_audit.json` and
`trapdoor12_independent_readonly_audit.py` in this review directory.
