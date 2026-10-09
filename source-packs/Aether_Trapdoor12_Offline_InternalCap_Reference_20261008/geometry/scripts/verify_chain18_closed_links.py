"""Maker's actual source/GLB checks of closed link parts,axisUV and union boundary."""
from pathlib import Path
import json,sys,hashlib,math,collections
GEOM=Path(__file__).resolve().parents[1];OUT=GEOM/'next_chain18'
sys.path.insert(0,str(Path(__file__).parent));sys.path.insert(0,str(GEOM/'reviews'))
from verify_stairs40_reference import record_hash,read_glb
from oak_fence_readonly_audit import mesh_checks,cross,sub,dot
from glb_distinct_storage_metrics import metrics
from topology_contract import cell_shell
from study_chain18_closed_link_cost import boxes,transform

def inverse_point(p,m):
    x,y,z=p;return (1-y,x,z) if m==16 else (x,z,1-y) if m==32 else p
def inverse_vector(p,m):
    x,y,z=p;return (-y,x,z) if m==16 else (x,z,-y) if m==32 else p
def normal(tri):
    n=cross(sub(tri[1],tri[0]),sub(tri[2],tri[0]));l=math.sqrt(dot(n,n));return tuple(v/l for v in n)

def contains(p,tri,n=None):
    n=n or normal(tri);a=max(range(3),key=lambda a:abs(n[a]));b,c=[i for i in range(3) if i!=a]
    if abs(p[a]-tri[0][a])>2e-6:return False
    v0=(tri[1][b]-tri[0][b],tri[1][c]-tri[0][c]);v1=(tri[2][b]-tri[0][b],tri[2][c]-tri[0][c]);v2=(p[b]-tri[0][b],p[c]-tri[0][c]);d=v0[0]*v1[1]-v1[0]*v0[1]
    if abs(d)<1e-14:return False
    u=(v2[0]*v1[1]-v1[0]*v2[1])/d;v=(v0[0]*v2[1]-v2[0]*v0[1])/d
    return min(u,v,1-u-v)>-1e-5

def check_arrays(points,tris,normals,uv,row):
    m=row['metadata'];mode=row['mode'];got=mesh_checks(points,tris,normals)
    assert got['triangles']==(144 if mode=='raw' else 96)
    assert not any(got[k] for k in ('degenerate_triangles','normal_mismatch_triangles','non_axis_aligned_triangles'))
    assert abs(got['signed_volume_m3']-.00750732421875)<1e-8
    assert abs(got['surface_area_m2']-(.630859375 if mode=='raw' else .560546875))<1e-7
    if mode=='candidate':assert got['coordinate_welded_non_two_incidence_edges']==got['edge_orientation_mismatches']==0
    records=[];uvbad=0;offset=inverse_vector(row['logical_world_origin'],m);tps=[];tns=[]
    for face in tris:
        tri=[points[i] for i in face];n=normal(tri);cn=inverse_vector(n,m);a=max(range(3),key=lambda a:abs(cn[a]));axes={0:(2,1),1:(0,2),2:(0,1)}[a]
        tps.append(tri);tns.append(n)
        for i in face:
            p=inverse_point(points[i],m);expected=tuple((p[a]+offset[a])*.5 for a in axes)
            uvbad+=max(abs(uv[i][j]-expected[j]) for j in range(2))>1e-6;records.append((*points[i],*normals[i],*uv[i]))
    assert uvbad==0
    rb=[]
    for lo,hi in boxes():
        a,b=transform(lo,m),transform(hi,m);rb.append((tuple(float(min(a[i],b[i])) for i in range(3)),tuple(float(max(a[i],b[i])) for i in range(3))))
    shell=cell_shell(rb);samples=miss=0
    for face in shell['faces']:
        ps=[shell['vertices_unity'][i] for i in face];n=normal(ps[:3])
        for u,v in ((.19,.27),(.51,.38),(.81,.69)):
            p=tuple(ps[0][a]+u*(ps[1][a]-ps[0][a])+v*(ps[3][a]-ps[0][a]) for a in range(3));samples+=1
            miss+=not any(dot(n,tn)>1-1e-5 and contains(p,tp,tn) for tp,tn in zip(tps,tns))
    assert miss==0
    # Each ofthree holes must remain empty throughlink'sextrusionaxis.
    holes=holefail=0
    for link in range(3):
        for u,v in ((.23,.37),(.5,.5),(.77,.61)):
            x=.453125+u*.09375;y=link/3+.046875+v*(1/3-.09375)
            p=(.5,y,1-x) if link%2 else (x,y,.5);p=tuple(map(float,transform(p,m)));rayaxis=0 if link%2 else 2
            direction=tuple(float(v) for v in transform_vector_unit(rayaxis,m));holes+=1
            hit=False
            for tp,tn in zip(tps,tns):
                denom=dot(direction,tn)
                if abs(denom)<.999:continue
                dist=dot(sub(tp[0],p),tn)/denom;q=tuple(p[a]+dist*direction[a] for a in range(3))
                #Isolate currentlinkdepth ±1/32;neighbourlink is not the hole'swall.
                if abs(dist)<=.0312505 and contains(q,tp,tn):hit=True
            holefail+=hit
    assert holefail==0
    h,n=record_hash(records);got.update(metadata=m,mode=mode,axis=row['axis'],canonical_surface_corner_sha256=h,
        canonical_unique_surface_corners=n,actual_axis_world_UV_failures=uvbad,external_union_samples=samples,external_union_misses=miss,
        hole_depth_rays=holes,hole_depth_ray_failures=holefail,three_closed_link_parts_not_welded_union=mode=='candidate',
        native_collision_or_phone_test_pass=False)
    return got

def transform_vector_unit(a,m):
    p=[0.,0.,0.];p[a]=1.
    return (p[1],-p[0],p[2]) if m==16 else (p[0],-p[2],p[1]) if m==32 else p

def source_cases():
    from blend_readonly_reader import BlendReader
    rows={r['object_name']:r for r in json.loads((OUT/'reports/chain18-actual-mesh-snapshots.json').read_text())['actual_axis_and_stack_meshes']}
    obs=[o for o in BlendReader(OUT/'source/iron_chain18_closed_link_reference.blend').mesh_objects() if o['name'] in rows];assert len(obs)==9
    result={};stack=[]
    for ob in obs:
        row=rows[ob['name']];me=ob['mesh'];ps=[(p[0],p[2],-p[1]) for p in me['positions']];assert [list(p) for p in ps]==row['vertices_unity'] and me['faces']==row['faces']
        assert len(me['uv'])==me['material_slots']==1;uvs=next(iter(me['uv'].values()));points=[];norms=[];uv=[];tri=[]
        for j,face in enumerate(me['faces']):
            lus=[uvs[me['face_offsets'][j]+k] for k in range(len(face))];assert [list(u) for u in lus]==row['face_loop_uv'][j]
            n=normal([ps[i] for i in face[:3]])
            for k in range(1,len(face)-1):
                ids=[]
                for idx in (0,k,k+1):ids.append(len(points));points.append(ps[face[idx]]);norms.append(n);uv.append(lus[idx])
                tri.append(ids)
        got=check_arrays(points,tri,norms,uv,row)
        if ob['name'].startswith('STACK_'):
            assert max(abs(ob['location'][a]-(row['logical_world_origin'][0],-row['logical_world_origin'][2],row['logical_world_origin'][1])[a]) for a in range(3))<1e-6
            stack.append((row,ps,me,uvs))
        result[ob['name']]=got
    # UV seam atcellboundaries:actualoutercap loopcorner pairs touchingcorrespondingY linkends.
    pairs=fail=0
    for a,b in zip(sorted(stack,key=lambda x:x[0]['logical_world_origin'][1]),sorted(stack,key=lambda x:x[0]['logical_world_origin'][1])[1:]):
        def record(s,side):
            row,ps,me,uvs=s;origin=row['logical_world_origin'];records=[]
            for fi,face in enumerate(me['faces']):
                n=normal([ps[i] for i in face[:3]])
                if abs(n[1])>.5:continue #Differentcaps sit againstneighbourparts;sideUV continuousworldphase only.
                for j,i in enumerate(face):
                    if abs(ps[i][1]-side)<1e-6:records.append((tuple(round(ps[i][k]+origin[k],6) for k in range(3)),tuple(round(x,5) for x in n),uvs[me['face_offsets'][fi]+j]))
            return records
        ra,rb=record(a,1),record(b,0)
        for p,n,u in ra:
            candidates=[v for q,m,v in rb if p==q and n==m]
            if candidates:pairs+=1;fail+=not any(max(abs(u[k]-v[k]) for k in range(2))<1e-6 for v in candidates)
    assert pairs==24 and fail==0
    return rows,result,{'actual_stacked_cell_pairs':2,'actual_stored_side_seam_loop_pairs':pairs,'UV_failures':fail}

def main():
    rows,sources,seams=source_cases();results={};storage={}
    expected=hashlib.sha256((GEOM.parent/'materials_b/approved_standalone/iron_block_v02/textures/candidate_512/basecolor.png').read_bytes()).hexdigest()
    for mode in ('raw','candidate'):
        path=OUT/'exports'/f'iron_chain18_{mode}3_axis_reference_atlas.glb';obs,th,mat=read_glb(path,3);assert th==expected;storage[mode]=metrics(path)
        for ob in obs:
            got=check_arrays(ob['points'],ob['faces'],ob['normals'],ob['uv'],rows[ob['name']]);assert got['canonical_surface_corner_sha256']==sources[ob['name']]['canonical_surface_corner_sha256']
            assert ob['node_extras']['metadata_reference']==rows[ob['name']]['metadata'] and ob['node_extras']['mobile_pass'] is False
            results[ob['name']]=got
    result={'author_self_check_not_independent_review':True,'actual_source_meshes':9,'actual_GLB_meshes':6,'source_cases':sources,'GLB_cases':results,
        'actual_stack_UV_seams':seams,'GLB_storage_metrics':storage,'exact_shared_iron_v02_512_map_sha256':expected,
        'same_planar_UV_interpolation_not_raw_triangle_subset_claim':True,'three_closed_parts_not_welded_union':True,
        'full_block_accepted':False,'native_integrated':False,'mobile_pass':False}
    (OUT/'reports/chain18-byte-selfcheck.json').write_text(json.dumps(result,indent=2));print(json.dumps({'source':9,'GLB':6,'storage':storage,'seams':seams,'status':'pass'}))
if __name__=='__main__':main()
