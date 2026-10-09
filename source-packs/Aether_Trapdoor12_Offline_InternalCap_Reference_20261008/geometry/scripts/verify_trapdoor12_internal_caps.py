"""Maker byte checks of real saved source36/GLB32; separate independent gate."""
from pathlib import Path
import json, sys, hashlib
GEOM=Path(__file__).resolve().parents[1];OUT=GEOM/'next_trapdoor12'
sys.path.insert(0,str(GEOM/'scripts'));sys.path.insert(0,str(GEOM/'reviews'))
from verify_stairs40_reference import read_glb, record_hash
from oak_fence_readonly_audit import mesh_checks, dot
from verify_chain18_closed_links import normal, contains
from topology_contract import cell_shell
from study_trapdoor12_component_caps import actual_parts
from study_fencegate21_component_caps import face_table, covering_rectangles, covered_area
from glb_distinct_storage_metrics import metrics

def expected_faces(meta,mode):
    parts=actual_parts(meta&3,bool(meta&4),bool(meta&8));fs=[]
    for i,(_,box) in enumerate(parts):
        for f in face_table(box):
            if mode=='candidate' and abs(covered_area(f,covering_rectangles(f,parts,i))-f['area_m2'])<1e-12:continue
            fs.append(f)
    return fs

def check_arrays(points,tris,normals,uv,row):
    meta,mode=row['metadata'],row['mode'];got=mesh_checks(points,tris,normals)
    assert got['triangles']==(72 if mode=='raw' else 56)
    assert not any(got[k] for k in ('degenerate_triangles','normal_mismatch_triangles','non_axis_aligned_triangles'))
    fs=expected_faces(meta,mode);assert abs(got['surface_area_m2']-sum(f['area_m2'] for f in fs))<1e-8
    bs=[b for _,b in actual_parts(meta&3,bool(meta&4),bool(meta&8))]
    bounds=[[min(b[i][a] for b in bs) if i==0 else max(b[i][a] for b in bs) for a in range(3)] for i in range(2)]
    assert got['bounds']==bounds
    got['checked_position_records']=got.pop('serialized_vertices')
    got['checked_records_not_claimed_serialized_vertex_array']=True
    got.pop('signed_volume_m3');got['signed_volume_not_union_or_collider_metric']=True
    records=[];trirecords=set();tps=[];tns=[];uvbad=0
    for face in tris:
        ps=[points[i] for i in face];n=normal(ps);axis=max(range(3),key=lambda a:abs(n[a]));axes={0:(2,1),1:(0,2),2:(0,1)}[axis]
        tps.append(ps);tns.append(n);rs=[]
        for i in face:
            expected=tuple(points[i][a]*.5 for a in axes)
            uvbad+=max(abs(uv[i][j]-expected[j]) for j in range(2))>1e-6
            r=(*points[i],*normals[i],*uv[i]);records.append(r);rs.append(tuple(round(v,6) for v in r))
        trirecords.add(tuple(sorted(rs)))
    assert uvbad==0
    shell=cell_shell(bs);samples=misses=0
    for face in shell['faces']:
        ps=[shell['vertices_unity'][i] for i in face];n=normal(ps[:3])
        for u,v in ((.19,.27),(.51,.38),(.81,.69)):
            p=tuple(ps[0][a]+u*(ps[1][a]-ps[0][a])+v*(ps[3][a]-ps[0][a]) for a in range(3))
            samples+=1;misses+=not any(dot(n,tn)>1-1e-5 and contains(p,tp,tn) for tp,tn in zip(tps,tns))
    assert misses==0
    h,n=record_hash(records)
    got.update(metadata=meta,mode=mode,canonical_surface_corner_sha256=h,canonical_unique_surface_corners=n,
        world2m_stored_UV_failures=uvbad,exterior_samples=samples,exterior_misses=misses,
        union_visual_volume_m3=shell['volume_m3'],original_solid_sheet_collision_volume_m3=.1875,
        collision_minus_visual_volume_m3=.1875-shell['volume_m3'],open_render_components_not_collider_pass=mode=='candidate')
    return got,trirecords

def source_cases():
    from blend_readonly_reader import BlendReader
    rows={r['object_name']:r for r in json.loads((OUT/'reports/trapdoor12-actual-mesh-snapshots.json').read_text())['actual_state_and_comparison_meshes']}
    obs=[o for o in BlendReader(OUT/'source/iron_trapdoor12_internal_cap_reference.blend').mesh_objects() if o['name'] in rows]
    assert len(obs)==36;result={}
    for ob in obs:
        row=rows[ob['name']];me=ob['mesh'];ps=[(p[0],p[2],-p[1]) for p in me['positions']]
        assert [list(p) for p in ps]==row['vertices_unity'] and me['faces']==row['faces']
        assert len(me['uv'])==me['material_slots']==1
        uvs=next(iter(me['uv'].values()));points=[];norms=[];uv=[];tris=[]
        for fi,face in enumerate(me['faces']):
            lus=[uvs[me['face_offsets'][fi]+i] for i in range(len(face))]
            assert [list(u) for u in lus]==row['face_loop_uv'][fi]
            n=normal([ps[i] for i in face[:3]])
            for k in range(1,len(face)-1):
                ids=[]
                for i in (0,k,k+1):
                    ids.append(len(points));points.append(ps[face[i]]);norms.append(n);uv.append(lus[i])
                tris.append(ids)
        result[ob['name']]=check_arrays(points,tris,norms,uv,row)[0]
        result[ob['name']].update(actual_saved_mesh_vertices=len(ps),saved_quads=len(me['faces']),
            expanded_triangle_corners=len(points),source_byte_reader_actual_vertex_array_count=True)
    return rows,result

def main():
    rows,source=source_cases();glb={};tri={};storage={}
    expected=hashlib.sha256((GEOM.parent/'materials_b/approved_standalone/iron_block_v02/textures/candidate_512/basecolor.png').read_bytes()).hexdigest()
    for mode in ('raw','candidate'):
        path=OUT/'exports'/f'iron_trapdoor12_{mode}16_endpoint_reference_atlas.glb';obs,th,mat=read_glb(path,16)
        assert th==expected;storage[mode]=metrics(path)
        for ob in obs:
            got,ts=check_arrays(ob['points'],ob['faces'],ob['normals'],ob['uv'],rows[ob['name']])
            got['actual_GLB_accessor_vertices']=len(ob['points'])
            assert got['canonical_surface_corner_sha256']==source[ob['name']]['canonical_surface_corner_sha256']
            assert ob['node_extras']['metadata_reference']==got['metadata'] and ob['node_extras']['original_solid_sheet_collision_not_replaced'] is True
            glb[ob['name']]=got;tri[mode,got['metadata']]=ts
    subsets=[]
    for meta in range(16):
        assert tri['candidate',meta]<=tri['raw',meta]
        subsets.append({'metadata':meta,'candidate_exact_P_N_UV_triangle_subset_of_raw':True})
    result={'author_self_check_not_independent_review':True,'actual_source_target_meshes':36,'actual_GLB_state_meshes':32,
        'source_cases':source,'GLB_cases':glb,'candidate_raw_exact_triangle_subsets':subsets,'GLB_storage_metrics':storage,
        'iron512_actual_embedded_map_sha256':expected,'original_solid_sheet_collision_not_replaced':True,
        'new_material_art_approvals':0,'finished_production_art_pass':False,'native_integrated':False,
        'full_block_accepted':False,'mobile_pass':False}
    (OUT/'reports/trapdoor12-byte-selfcheck.json').write_text(json.dumps(result,indent=2))
    print(json.dumps({'source':36,'GLB':32,'triangle_subset_all16':True,'storage':storage,'status':'pass'}))

if __name__=='__main__':main()
