"""Historical catalog-backed Trapdoor12 cost study; no model or engine edit.

Only wholly backed component caps are omitted. Kept faces retain their original
triangles. Partially covered faces and crossing-bar overlaps remain disclosed.
"""
from pathlib import Path
from itertools import product
import hashlib, json, sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from topology_contract import cell_shell
from study_fencegate21_component_caps import face_table, covering_rectangles, covered_area, exact_union_topology

T, E, M0, M1 = .1875, .125, .4375, .5625

def local_parts():
    return [('front_border', ((0.,0.,0.), (1.,T,E))),
        ('back_border', ((0.,0.,1-E), (1.,T,1.))),
        ('left_border', ((0.,0.,E), (E,T,1-E))),
        ('right_border', ((1-E,0.,E), (1.,T,1-E))),
        ('cross_X', ((E,0.,M0), (1-E,T,M1))),
        ('cross_Z', ((M0,0.,E), (M1,T,1-E)))]

def actual_parts(facing, up, opened):
    def point(p):
        x,y,z = p
        if not opened:
            return x, y + (1-T if up else 0), z
        if facing == 0:
            return x,z,1-T+y
        if facing == 2:
            return x,z,y
        if facing == 1:
            return y,z,x
        return 1-T+y,z,x
    rows=[]
    for name,box in local_parts():
        corners=[point(p) for p in product(*zip(box[0],box[1]))]
        rows.append((name,(tuple(min(p[a] for p in corners) for a in range(3)),
            tuple(max(p[a] for p in corners) for a in range(3)))))
    return rows

def face_rectangle(f):
    ps=f['vertices']; axis=f['axis']; other=[a for a in range(3) if a!=axis]
    return tuple(min(p[a] for p in ps) for a in other), tuple(max(p[a] for p in ps) for a in other)

def shell_face_record(ps):
    axis=next(a for a in range(3) if len({p[a] for p in ps})==1)
    u=[ps[1][a]-ps[0][a] for a in range(3)];v=[ps[2][a]-ps[0][a] for a in range(3)]
    n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
    other=[a for a in range(3) if a!=axis]
    return {'axis':axis,'sign':1 if n[axis]>0 else -1,'plane':ps[0][axis],
        'rect_min':tuple(min(p[a] for p in ps) for a in other),
        'rect_max':tuple(max(p[a] for p in ps) for a in other),
        'area_m2':(max(p[other[0]] for p in ps)-min(p[other[0]] for p in ps))*(max(p[other[1]] for p in ps)-min(p[other[1]] for p in ps))}

def main():
    out=ROOT/'cost_studies/trapdoor12';out.mkdir(parents=True,exist_ok=True)
    cat=json.loads((ROOT.parent/'inventory/catalog_snapshot.json').read_text())
    mapping=[{'name':r['name'],'texId':i+cat['baseTextureId'],'shapeId':12,'family':r['family'],
        'color':r['color'],'transparent':r['transparent']} for i,r in enumerate(cat['blocks']) if r['shape']==12]
    assert {r['name'] for r in mapping}=={'spruce_trapdoor','dark_oak_trapdoor','iron_trapdoor'}
    hist=ROOT/'historical/ChunkMeshGenerator.cs';source=hist.read_text()
    start=source.index('    static void PutTrapdoor(');end=source.index('    #region Misc, Foliages',start)
    assert source[start:end].count('PutSolidBox(')==18
    assert all(k in source[start:end] for k in ('0.1875f','0.125f','0.4375f','0.5625f'))
    cases=[];external_checks=backing_checks=failures=0;patterns=set()
    for facing,up,opened in product(range(4),(False,True),(False,True)):
        parts=actual_parts(facing,up,opened);boxes=[b for _,b in parts]
        kept=[];removed=[];component_rows=[]
        for i,(name,box) in enumerate(parts):
            kept_for_part=[];removed_for_part=[];bits=0
            for face in face_table(box):
                cover=covering_rectangles(face,parts,i);area=covered_area(face,cover)
                if abs(area-face['area_m2'])<1e-12:
                    removed.append(face);removed_for_part.append(face);bits|=face['flag']
                    # Exact rectangle-union backing at elementary subdivisions.
                    backing_checks+=1;failures+=abs(area-face['area_m2'])>=1e-12
                else:
                    kept.append(face);kept_for_part.append(face)
            component_rows.append({'name':name,'box_bounds':box,'hiddenFaces':bits,
                'kept_triangles':2*len(kept_for_part),'removed_wholly_backed_faces':len(removed_for_part)})
        assert len(parts)==6 and len(removed)==8 and len(kept)==28
        shell=cell_shell(boxes);topology=exact_union_topology(shell)
        assert abs(shell['volume_m3']-.1142578125)<1e-12
        assert topology['exact_silhouette_closed_shell_triangle_floor']==92
        # Union exterior elementary rectangle coverage by kept faces, not a
        # permissive point-only proximity test. Each is coplanar and outward.
        for ids in shell['faces']:
            f=shell_face_record([shell['vertices_unity'][i] for i in ids]);rects=[]
            for q in kept:
                if q['axis']==f['axis'] and q['sign']==f['sign'] and q['plane']==f['plane']:
                    a,b=face_rectangle(q)
                    a=tuple(max(a[i],f['rect_min'][i]) for i in range(2))
                    b=tuple(min(b[i],f['rect_max'][i]) for i in range(2))
                    if all(a[i]<b[i] for i in range(2)):
                        rects.append(('kept',a,b))
            covered=covered_area(f,rects)
            external_checks+=1;failures+=abs(covered-f['area_m2'])>1e-12
        patterns.add(tuple(sorted(boxes)))
        volume_solid=T
        cases.append({'metadata':facing|(4 if up else 0)|(8 if opened else 0),'facing':facing,
            'up':up,'opened':opened,'closed_facing_ignored':not opened,'open_up_ignored':opened,
            'raw_triangles':72,'candidate_internal_cap_triangles':56,'savings_triangles':16,
            'savings_percent':100*16/72,'raw_triangle_stream_vertices':216,'candidate_triangle_stream_vertices':168,
            'raw_position_normal_uv_float32_derived_bytes':6912,'candidate_position_normal_uv_float32_derived_bytes':5376,
            'derived_native_byte_estimate_not_actual_allocation':True,'exact_closed_union_topology':topology,
            'union_visual_volume_m3':shell['volume_m3'],'historical_solid_sheet_collision_volume_m3':volume_solid,
            'render_hole_volume_m3_but_solid_sheet_collider':volume_solid-shell['volume_m3'],
            'one_batched_render_mesh_per_state':True,'candidate_is_closed_union':False,
            'original_collision_sheet_preserved_reference_only':True,'parts':component_rows})
    assert len(cases)==16 and len(patterns)==6 and failures==0
    report={'study':'Trapdoor12 conservative wholly backed component-cap cost only',
        'historical_commit':'0956b0777cf007a7a3b1ed799f7ade777f14c80d','catalog_count':645,
        'catalog_names':mapping,'current_baseline_verified':False,'source_sha256':hashlib.sha256(hist.read_bytes()).hexdigest(),
        'source_lines':'ChunkMeshGenerator.cs 964-1042; VoxelBlockPhysics.cs Trapdoor branch',
        'render_thickness_m':T,'lattice19_thickness_m':.125,'trapdoor_and_lattice_contracts_not_interchangeable':True,
        'states':cases,'metadata_states':16,'distinct_geometric_occupancies':6,
        'exact_whole_deleted_cap_backing_checks':backing_checks,'exact_union_exterior_elementary_rectangle_checks':external_checks,
        'geometry_probe_failures':failures,'unclosed_components_remain':True,
        'partial_border_faces_and_cross_bar_overlap_retained':True,'native_neighbor_culling_not_replaced':True,
        'no_adjacent_block_or_glass_based_outercap_culling':True,'no_coplanar_retriangulation':True,
        'native_full_visual_equivalence_unverified':True,'collision_holes_are_not_character_or_ray_passage_approval':True,
        'source_models_exports_render_created':False,'independent_review':'pending',
        'new_material_art_approvals':0,'finished_production_art_pass':False,'native_integrated':False,
        'full_block_accepted':False,'mobile_pass':False}
    (out/'trapdoor12-component-cap-cost-study.json').write_text(json.dumps(report,indent=2)+'\n')
    (out/'TRAPDOOR12_COST_DECISION.md').write_text('''# Trapdoor12 real remaining shape cost

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
''')
    print(json.dumps({'metadata_states':16,'distinct_occupancies':6,'triangles_raw_caponly_closed_floor':[72,56,92],
        'deleted_whole_cap_checks':backing_checks,'exterior_elementary_rectangles':external_checks,'failures':failures,
        'collider_render_volume_difference_m3':.0732421875,'source_or_exports_or_render_generated':False}))

if __name__=='__main__':
    main()
