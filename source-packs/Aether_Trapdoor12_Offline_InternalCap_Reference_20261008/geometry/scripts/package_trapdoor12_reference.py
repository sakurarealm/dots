"""Package already independently reviewed Trapdoor12 geometry, keep art false."""
from pathlib import Path
from PIL import Image
import ast, hashlib, json, re, zipfile, posixpath
ROOT=Path('/workspace/shared/aether-mobile-blocks');GEOM=ROOT/'geometry';OUT=GEOM/'next_trapdoor12';D=OUT/'delivery'

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,v):p.write_text(json.dumps(v,indent=2)+'\n')

def main():
    a=GEOM/'reviews/trapdoor12_independent_readonly_audit.json';audit=json.loads(a.read_text())
    assert audit['independent_checks_pass'] and audit['limited_offline_geometry_reference_pass']
    assert audit['new_material_art_approvals']==0
    assert not any(audit[k] for k in ('finished_production_art_pass','full_block_accepted','native_integrated','mobile_pass'))
    for group in ('artifact_sha256','reviewed_maker_reports_and_specs_sha256'):
        for rel,h in audit[group].items():assert sha(OUT/rel)==h,rel
    index=json.loads((D/'preview_index_prepackage.json').read_text());rows=index['rows'];assert len(rows)==9
    for row in rows:
        p=OUT/row['original_path'];q=OUT/row['delivered_path']
        assert sha(p)==row['original_PNG_sha256'] and sha(q)==row['delivered_WebP_sha256']
        a1=Image.open(p).convert('RGBA');b=Image.open(q).convert('RGBA')
        assert a1.size==b.size and a1.tobytes()==b.tobytes()
        assert hashlib.sha256(b.tobytes()).hexdigest()==row['decoded_RGBA_sha256']
    index.update(independent_review='PASS_LIMITED_OFFLINE_HISTORICAL_GEOMETRY_REFERENCE',finished_production_art_pass=False,
        original_encoded_PNG_bytes_delivered=False,original_encoded_PNG_bytes_reconstructible=False)
    finalindex=D/'preview_index.json';dump(finalindex,index)
    status=D/'REVIEW_STATUS.md';status.write_text('''# Final limited independent review

trapdoor12_independent_review.md and trapdoor12_independent_readonly_audit.json
confirm a limited historical offline geometry reference PASS. The maker-stage
pending sentence in SPECS_AND_SCOPE.md is preserved as an audited input; this
addendum gives the final limited status without changing its audited hash.

Independent saved source36 plus preview-ground1, GLB32 and FBX16 checks passed.
All16 actual candidate P/N/UV triangle sets are exact raw subsets. Eight wholly
backed original quads per candidate are independently reconstructed. There
are1248 exterior boundary probes and64 four-hole through-line checks with
zero failures. FBX corner sets agree but can use another quad diagonal.
The author48 Blender imports remain maker evidence, not independent imports;
the old import vertex-array lengths were not recorded and are not inferred.

The conspicuous original crossing-bar black patch remains in both raw and
candidate pictures. Finished production art, full block, native integration
and phone approval remain false. New material-art approvals0. The open
component render mesh is not a closed collider. Source vertices144/112 and
GLB POSITION vertices144/112 are distinct from expanded check corners216/168.
''')
    readme=D/'README_Trapdoor12_reference.txt';readme.write_text('''Aether Trapdoor12 conservative internal-cap offline geometry reference
2026-10-08 UTC

Limited independent historical geometry reference PASS. This is not finished
production artwork, a fully accepted block, native integration or a phone
test. The conspicuous retained raw crossing-bar black centre prevents a
finished-production-art pass. New art approvals0. Read REVIEW_STATUS and the
full independent review first. Every false native/full/art/device gate stays
false. The pending maker statement in the specification is historical; its
audited bytes are preserved and final limited status is in the addendum.

Actual catalog shape12 applies to spruce_trapdoor tex532, dark_oak_trapdoor
tex537 and iron_trapdoor tex665. The reference only shares the exact approved
iron v02 original material; it approves no wood variants or new material.
Shape12 has six boxes, 3/16m thickness and four5/16m openings. Lattice19 has
seven boxes and1/8m thickness; these models are not interchangeable.

Sixteen real metadata endpoints have six distinct occupied layouts. Closed
ignores facing; open ignores upper. Raw72 becomes candidate56 triangles by
omitting eight wholly backed original quad caps. Remaining geometry and
attributes retain their actual raw triangles. No neighbour or outer-boundary
culling, coplanar merging, greedy proxy, hole filling or arbitrary closure.
One batched mesh and one material per endpoint, not a renderer per component.
The92triangle exact welded closed-union floor would be more costly.

Actual source36 target meshes plus ground1, GLBs32 state meshes and FBX16
geometries are independently checked. Sixteen P/N/UV candidate triangle sets
are exact raw subsets;1248 boundary points and64 hole through-line probes
pass. Saved source mesh vertices144/112 and quads36/28 are not the expanded
triangle check corners216/168. Maker48 guarded Blender imports match source
corner sets after verified1/16m float normalization; FBX may use another quad
diagonal. Actual imported vertex-array counts were not recorded and are not
inferred. There was no independent Blender or Unity import or phone run.

Render union volume0.1142578125m3 and original solid-sheet collision0.1875m3
differ by0.0732421875m3. Holes do not establish character or ray passage.
Open render components do not become a collision replacement. Chunk and
VoxelVolume physics, current discrete interaction/body safety, picking,
metadata/IDs, save/dirty updates, world UV/tint/shader and native attributes
remain unverified. No animated hinge, pivot or continuous sweep is supplied.
Page atlas translations are staging only. Historical source0956b077 is not
a verified current engine revision. No repository or registry changed.

Source packs512 and GLBs embed exact approved512 albedo. FBX uses a relative
texture map: keep geometry/ and materials_b/ sibling folders. FBX conventional
Phong/DiffuseColor serialization is not approved native/Unity PBR. The
diffuse-toon512/256 pictures do not test native metallic family3 albedo bypass
or phone appearance. Raw/candidate front is near-identical, not exact:
MAD0.00000286102294921875, max4, four pixels >2 on the0-255 RGB scale.

Distinct physical mesh bytes74160 to57680 save16480 (22.2222%). Accessor
reference sums80640 to62720 repeat shared index data. Whole GLBs305080 to
288872 save16208 (5.3127%). These separate file metrics do not measure
GPU/native allocations, draw calls or frame times. All nine supplied WebPs
have exactly the original decoded RGBA pixels. The index records original
PNG hashes and delivered WebP/pixel hashes. Original encoded PNG bytes are
not delivered or reconstructible. restore_trapdoor12_preview_pixels.py can
verify WebPs and optionally recreate missing pixel-identical PNG files;
original PNG encoded-byte/hash auditing still requires the originals.

Reproduction scripts may need ROOT adjustment after relocation. Any Blender
reproduction uses the included shared serial guard, two CPU threads,
MemAvailable>=3GiB and disk>=2GiB. First bad-framing source/images are isolated
outside this delivery and not included. Future current-source/native/phone
adoption needs new evidence and separate execution authorization.
''')
    selected={readme,status,finalindex,OUT/'SPECS_AND_SCOPE.md'}
    for folder in ('source','exports','reports'):
        selected.update(p for p in (OUT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ('.blend1','.pyc'))
    reviews=[GEOM/'reviews'/('trapdoor12_independent_'+n) for n in ('review.md','readonly_audit.json','readonly_audit.py')]
    assert all(p.is_file() for p in reviews);selected.update(reviews)
    selected.update(OUT/row['delivered_path'] for row in rows)
    selected.update(GEOM/'historical'/name for name in ('ChunkMeshGenerator.cs','ArchitecturalShapes.cs','McBlockStateMetadata.cs',
        'VoxelBlockPhysics.cs','VoxelBlockInteraction.cs','Vox.cs','VoxShapeRegistry.cs','TerrainTexBlend.hlsl'))
    selected.update(p for p in (GEOM/'cost_studies/trapdoor12').glob('*') if p.is_file())
    iron=ROOT/'materials_b/approved_standalone/iron_block_v02'
    selected.update(iron/'textures'/res/name for res in ('candidate_512','mobile_256') for name in
        ('basecolor.png','normal_flat_gl.png','roughness_constant.png','dram_native.png','hdrp_mask_bridge.png'))
    selected.update((iron/'README.txt',iron/'APPROVAL_SCOPE.json'))
    pending=[GEOM/'scripts'/name for name in ('build_trapdoor12_internal_caps.py','verify_trapdoor12_internal_caps.py',
        'roundtrip_trapdoor12_internal_caps.py','label_trapdoor12_previews.py','restore_trapdoor12_preview_pixels.py','package_trapdoor12_reference.py')]
    pending.append(reviews[-1]);scanned=set()
    while pending:
        p=pending.pop()
        if p in scanned:continue
        scanned.add(p);selected.add(p)
        for node in ast.walk(ast.parse(p.read_text())):
            names=[a.name.split('.')[0] for a in node.names] if isinstance(node,ast.Import) else ([node.module.split('.')[0]] if isinstance(node,ast.ImportFrom) and node.module else [])
            for name in names:
                for base in (GEOM/'scripts',GEOM/'reviews'):
                    q=base/(name+'.py')
                    if q.exists() and q not in scanned:pending.append(q)
    selected.add(ROOT/'scripts/run_locked_blender.sh');assert all(p.is_file() for p in selected)
    manifest=D/'content_manifest.json';dump(manifest,{'scope':'Trapdoor12 conservative internal-cap limited offline geometry reference',
        'finished_production_art_pass':False,'new_material_art_approvals':0,'native_integrated':False,'full_block_accepted':False,'mobile_pass':False,
        'files':[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(selected)]});selected.add(manifest)
    zpath=D/'Aether_Trapdoor12_Offline_InternalCap_Reference_20261008.zip'
    with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in sorted(selected):z.write(p,str(p.relative_to(ROOT)))
    with zipfile.ZipFile(zpath) as z:
        assert z.testzip() is None
        for p in selected:assert z.read(str(p.relative_to(ROOT)))==p.read_bytes(),p
        for p in (OUT/'exports').glob('*.fbx'):
            refs=re.findall(rb'(?:\.\./){2,}materials_b/[^\x00\r\n]+?\.png',p.read_bytes());assert refs
            for ref in refs:assert posixpath.normpath(posixpath.join(str(p.parent.relative_to(ROOT)),ref.decode())) in z.namelist()
        for group in ('artifact_sha256','reviewed_maker_reports_and_specs_sha256'):
            for rel,h in audit[group].items():assert hashlib.sha256(z.read(str((OUT/rel).relative_to(ROOT)))).hexdigest()==h
    assert zpath.stat().st_size<=15_000_000
    result={'local_path':str(zpath),'size_bytes':zpath.stat().st_size,'file_count':len(selected),'sha256':sha(zpath),
        'package_integrity':'All selected bytes, CRC, audited source/export/report hashes, relative FBX512 map and9 lossless WebP RGBA pixels pass',
        'independent_geometry_reference':'pass_limited_historical','finished_production_art_pass':False,'new_material_art_approvals':0,
        'full_block_accepted':False,'native_integrated':False,'mobile_pass':False,'Library_save':'pending'}
    dump(D/'package-result.json',result);print(json.dumps(result))

if __name__=='__main__':main()
