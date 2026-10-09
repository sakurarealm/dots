"""Package existing independently reviewed fence extras without new assets."""
from pathlib import Path
import ast, hashlib, json, zipfile
ROOT=Path('/workspace/shared/aether-mobile-blocks');GEOM=ROOT/'geometry';D=GEOM/'delivery/fence_extra'

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,v):p.write_text(json.dumps(v,indent=2)+'\n')

def main():
    D.mkdir(exist_ok=True)
    review=GEOM/'reviews/fence-extra-independent-review.md';a=GEOM/'reviews/fence-extra-independent-audit.json'
    audit=json.loads(a.read_text());decision=audit['decision'];assert review.is_file()
    assert decision['multicell_paired_contact_cap_only_removal']=='verified_four_existing_offline_patterns'
    assert decision['partial52_actual_GLB_bytes_source_geometry']=='verified_mask10_render_reference_only'
    assert not any(decision[k] for k in ('partial52_clean_exterior','partial52_closed_collider','all16_partial_adapter_verified',
        'full_state_block_accepted','native_integrated','mobile_pass','production_art_accepted'))
    selected={review,a,GEOM/'reviews/fence-extra-readonly-audit.py'}
    for f in audit['handoff_fingerprints']:
        p=GEOM/f['path'];assert p.stat().st_size==f['size_bytes'] and sha(p)==f['sha256'];selected.add(p)
    source=GEOM/'source/oak_fence_connection_phase_reference.blend';assert sha(source)==audit['comparison_state_reference_sha256'];selected.add(source)
    for row in audit['actual_serialized_cost_comparison']['rows']:
        p=GEOM/row['file'];assert p.stat().st_size==row['file_bytes'] and sha(p)==row['sha256'];selected.add(p)
    selected.update(GEOM/'reviews'/name for name in ('oak_fence_v02_independent_review.md','oak_fence_v02_independent_audit.json',
        'fence_states_stairs_independent_audit.json','fence_states_stairs_readonly_audit.py'))
    selected.update(GEOM/'historical'/name for name in ('ChunkMeshGenerator.cs','ArchitecturalShapes.cs','VoxelBlockPhysics.cs',
        'McBlockStateMetadata.cs','Vox.cs','TerrainTexBlend.hlsl'))
    selected.update(GEOM/'reports'/name for name in ('fence-state-phase-render.json','fence-state-back-render.json'))
    oak=ROOT/'materials_a/textures/oak_planks'
    selected.update(oak/res/'basecolor.png' for res in ('candidate_512','mobile_256'))
    selected.update(ROOT/'materials_a/approved_standalone/oak_planks_v02'/name for name in ('README.txt','APPROVAL_SCOPE.json'))
    readme=D/'README_Fence_Extra_reference.txt';readme.write_text('''Aether fence existing multi-cell and partial52 offline reference addendum
2026-10-08 UTC

This closes only the additional existing multi-cell/contact-cap/world-phase,
partial52 file/cost and complementary-back evidence. No new model, render,
material artwork, shader, registry or engine changes were created. New full
accepted blocks0; production art, native integration and phone gates false.
Read the independent review before using these files. No runtime
representation is selected.

Four original assemblies preserve complete expected exterior and actual
world-offset directional UV. Line264->240, corner184->168, T268->244,
four_way356->324 triangles remove only24 pairs of matching caps (96tri total).
Independent1468 exact exterior plane partitions have no missing, extra or
duplicate boundary coverage. Actual1584 stored UV loops and12 real X/Z
seams/192 exposed loop pairs agree, including negative logical cell origins.
These welded review assemblies do not implement voxel IDs, chunk ownership,
picking, dirty updates, cap restoration or native collision.

Mask10 serialized GLB comparisons: union84/132 attribute vertices/4728 mesh
bytes/232468 whole-file bytes; raw overlap60/120 vertices/4200 mesh bytes/
231948 file bytes; partial52/104 vertices/3640 mesh bytes/231444 file bytes.
The union adds40% triangles over raw60. Partial52 saves13.333% triangles and
560 physical mesh accessor bytes. All are offline file metrics, not GPU/native
allocations, draw calls, frame times or mobile performance.

Partial52 is a limited mask10 rendering comparison, not a clean production
mesh, closed collider or all16 adapter. Its26 source rectangles are exactly
covered by52 actual exported triangles, with correct stored P/N/UV and full
2.25m2 exterior, but0.125m2 retained internal post faces and16 open rail-mouth
edges remain. All76 of2860 generic triangle-boundary probe failures are those
internal post-face probes; missing exterior/reversed/unsupported are0.
Surface-integral volume0.1145833333 is not a valid closed-shell physics metric.

Rails were trimmed from cell-centre0.5 to post faces0.375/0.625, introducing
16 new endpoints. The candidate is not a raw60 triangle/corner/attribute
subset and does not establish nonlinear vertex-interpolation equivalence.
The GLB node retains cost-page staging translation[-1.4560879469,0,
-0.9707252383]. Local cell bounds do not make it a grid-origin drop-in export.
The original raw60 comparator retains0.59375m2 internal faces and0.03125m2
coplanar duplicate exterior; its visible black post-top patch is disclosed.
Neither collider nor production art is approved by this reference comparison.

Source uses actual saved diffuse-toon output, whereas partial52 GLB uses
single-sided opaque PBR with exact embedded oak512. The existing images do
not validate exported PBR or target native shader behavior. Same original
oak512 SHA3ef497d9c74f42db633f9434d4593c3b5b0a65f6044c093efe9cb3f174b24031
is packed/embedded; no new material approval. Ordinary baked review UV is not
native(texId,0) UV0. Historical fence VoxelVolume full-cell fallback stays open.

All five original PNGs are included without conversion: multi-cell raw and
annotated, cost raw and annotated, complementary16 back contact. The16 back
camera is a second ABOVE-oblique angle, not an underside/full-angle/native
dynamic test. The report lists exact dimensions, hashes and view limitations.
Four-way partial92 is arithmetic only, with no verified actual mesh or all16
trimmed adapter. Historic0956b077 is not verified current engine behavior.

Relative geometry/ and materials_a/ paths are retained. The independent
readonly script can reproduce this report from the included existing bytes;
it does not render or import models. Generic source-generation helpers may
need ROOT adjustment if relocated. Any future Blender work uses the shared
serial guard with2CPU threads, RAM>=3GiB and disk>=2GiB. This package does not
authorize native integration or infer a phone pass from the offline results.
''');selected.add(readme)
    pending=[GEOM/'scripts'/name for name in ('render_fence_patterns_cost.py','fix_partial52_export.py',
        'render_fence_state_back.py','package_fence_extra_reference.py')]
    pending.extend(p for p in selected if p.suffix=='.py');scanned=set()
    while pending:
        p=pending.pop()
        if p in scanned:continue
        scanned.add(p);selected.add(p)
        for node in ast.walk(ast.parse(p.read_text())):
            names=[x.name.split('.')[0] for x in node.names] if isinstance(node,ast.Import) else ([node.module.split('.')[0]] if isinstance(node,ast.ImportFrom) and node.module else [])
            for name in names:
                for base in (GEOM/'scripts',GEOM/'reviews'):
                    q=base/(name+'.py')
                    if q.exists() and q not in scanned:pending.append(q)
    selected.add(ROOT/'scripts/run_locked_blender.sh');assert all(p.is_file() for p in selected)
    manifest=D/'content_manifest.json';dump(manifest,{'scope':'Limited existing fence extra reference evidence only',
        'new_assets_created':False,'new_material_art_approvals':0,'partial52_clean_exterior':False,'partial52_closed_collider':False,
        'production_art_pass':False,'full_block_accepted':False,'native_integrated':False,'mobile_pass':False,
        'files':[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(selected)]});selected.add(manifest)
    zip_path=D/'Aether_Fence_Extra_Offline_Reference_Audit_20261008.zip'
    with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in sorted(selected):z.write(p,str(p.relative_to(ROOT)))
    with zipfile.ZipFile(zip_path) as z:
        assert z.testzip() is None
        for p in selected:assert z.read(str(p.relative_to(ROOT)))==p.read_bytes()
        for f in audit['handoff_fingerprints']:
            assert hashlib.sha256(z.read(str((GEOM/f['path']).relative_to(ROOT)))).hexdigest()==f['sha256']
    assert zip_path.stat().st_size<=15_000_000
    result={'local_path':str(zip_path),'file_count':len(selected),'size_bytes':zip_path.stat().st_size,'sha256':sha(zip_path),
        'integrity':'All original source/GLB/PNG/review bytes and12 handoff fingerprints exact; CRC pass',
        'independent_review':'limited existing multicell world-phase and mask10 partial52 render comparison only',
        'new_assets_created':False,'new_material_art_approvals':0,'production_art_pass':False,'full_block_accepted':False,
        'native_integrated':False,'mobile_pass':False,'Library_save':'pending'}
    dump(D/'package-result.json',result);print(json.dumps(result))

if __name__=='__main__':main()
