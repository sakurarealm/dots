"""One catalog-backed geometry cost study. Pure Python, no Blender or engine changes."""
from pathlib import Path
from itertools import product
from collections import defaultdict
import hashlib,json,sys

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'cost_studies'/'fencegate21'
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import cell_shell

FLAGS={(1,1):1,(1,-1):2,(2,-1):4,(2,1):8,(0,-1):16,(0,1):32}


def boxes(opened):
    result=[('left_post',((0.,0.,.4375),(.125,1.,.5625))),
            ('right_post',((.875,0.,.4375),(1.,1.,.5625)))]
    if opened:
        result.extend((name,(lo,hi)) for name,lo,hi in (
            ('left_lower_leaf',(0.,.25,.5625),(.125,.375,1.)),
            ('left_upper_leaf',(0.,.6875,.5625),(.125,.8125,1.)),
            ('right_lower_leaf',(.875,.25,.5625),(1.,.375,1.)),
            ('right_upper_leaf',(.875,.6875,.5625),(1.,.8125,1.))))
    else:
        result.extend((name,(lo,hi)) for name,lo,hi in (
            ('lower_crossbar',(.125,.25,.4375),(.875,.375,.5625)),
            ('upper_crossbar',(.125,.6875,.4375),(.875,.8125,.5625)),
            ('central_connector',(.4375,.375,.4375),(.5625,.6875,.5625))))
    return result


def face_table(box):
    lo,hi=box;result=[]
    for axis in range(3):
        other=[a for a in range(3) if a!=axis]
        for sign in (-1,1):
            plane=hi[axis] if sign>0 else lo[axis]
            ps=[]
            for a,b in ((0,0),(1,0),(1,1),(0,1)):
                p=list(lo);p[axis]=plane;p[other[0]]=hi[other[0]] if a else lo[other[0]];p[other[1]]=hi[other[1]] if b else lo[other[1]];ps.append(tuple(p))
            if (1 if axis in (0,2) else -1)!=sign:ps.reverse()
            result.append({'axis':axis,'sign':sign,'plane':plane,'flag':FLAGS[axis,sign],
                'vertices':ps,'area_m2':(hi[other[0]]-lo[other[0]])*(hi[other[1]]-lo[other[1]]),
                'rect_min':tuple(lo[a] for a in other),'rect_max':tuple(hi[a] for a in other)})
    return result


def covering_rectangles(face,parts,self_index):
    axis,sign,plane=face['axis'],face['sign'],face['plane'];other=[a for a in range(3) if a!=axis]
    result=[]
    for i,(name,(lo,hi)) in enumerate(parts):
        if i==self_index:continue
        # The box must occupy the face's outward side. Exact touching contact
        # is sufficient; coplanar or same-side faces are never culled.
        if not (lo[axis]<=plane and hi[axis]>plane if sign>0 else lo[axis]<plane and hi[axis]>=plane):continue
        a=tuple(max(lo[k],face['rect_min'][j]) for j,k in enumerate(other))
        b=tuple(min(hi[k],face['rect_max'][j]) for j,k in enumerate(other))
        if all(a[j]<b[j] for j in range(2)):result.append((name,a,b))
    return result


def covered_area(face,rectangles):
    if not rectangles:return 0.
    xs=sorted({face['rect_min'][0],face['rect_max'][0],*[v for _,a,b in rectangles for v in (a[0],b[0])]})
    ys=sorted({face['rect_min'][1],face['rect_max'][1],*[v for _,a,b in rectangles for v in (a[1],b[1])]})
    total=0.
    for x0,x1 in zip(xs,xs[1:]):
        for y0,y1 in zip(ys,ys[1:]):
            x,y=(x0+x1)/2,(y0+y1)/2
            if any(a[0]<x<b[0] and a[1]<y<b[1] for _,a,b in rectangles):total+=(x1-x0)*(y1-y0)
    return total


def transform(p,f):
    x,y,z=p
    return (1-z,y,x) if f==1 else (1-x,y,1-z) if f==2 else (z,y,1-x) if f==3 else p


def rotated_box(box,f):
    corners=[transform(p,f) for p in product(*zip(box[0],box[1]))]
    return (tuple(min(p[a] for p in corners) for a in range(3)),tuple(max(p[a] for p in corners) for a in range(3)))


def point_on_face(p,face):
    a=face['axis'];other=[k for k in range(3) if k!=a]
    return abs(p[a]-face['plane'])<1e-9 and all(face['rect_min'][j]-1e-9<=p[k]<=face['rect_max'][j]+1e-9 for j,k in enumerate(other))


def exact_union_topology(shell):
    normals=defaultdict(set);edges=set();adj=defaultdict(set)
    for face in shell['faces']:
        ps=[shell['vertices_unity'][i] for i in face]
        for axis in range(3):
            if len({p[axis] for p in ps})==1:break
        sign=1 if ps[0][axis] else -1
        # Sign does not affect functional-corner axis count below.
        for v in face:normals[v].add(axis)
        for a,b in zip(face,face[1:]+face[:1]):edges.add(tuple(sorted((a,b))));adj[a].add(b);adj[b].add(a)
    unseen=set(normals);components=0
    while unseen:
        stack=[unseen.pop()];components+=1
        while stack:
            v=stack.pop()
            for w in adj[v]&unseen:unseen.remove(w);stack.append(w)
    corners=sum(len(v)==3 for v in normals.values())
    chi=len(shell['vertices_unity'])-len(edges)+len(shell['faces']);g=(2*components-chi)//2
    return {'functional_corner_count':corners,'components':components,'total_genus':g,
        'Euler_characteristic':chi,'exact_silhouette_closed_shell_triangle_floor':2*(corners-2*components+2*g)}


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    ledger=json.loads((ROOT.parent/'coverage_ledger.json').read_text())
    mapping=[{k:b[k] for k in ('key','historical_tex_id','shape_id','shape','family','source_commit')} for b in ledger['blocks'] if b['shape_id']==21]
    assert len(mapping)==11 and any(b['key']=='minecraft:oak_fence_gate' for b in mapping)
    decisions=[];statecases=[]
    for opened in (False,True):
        parts=boxes(opened);retained=[];rows=[];removed=0;removed_area=partial_area=0.
        for idx,(name,box) in enumerate(parts):
            keep=[];remove=[];mask=0
            for face in face_table(box):
                coverings=covering_rectangles(face,parts,idx);area=covered_area(face,coverings)
                if abs(area-face['area_m2'])<1e-12:
                    removed+=1;removed_area+=area;mask|=face['flag']
                    remove.append({'axis':face['axis'],'sign':face['sign'],'hiddenFaces_bit':face['flag'],
                        'covered_area_m2':area,'exact_face_area_m2':face['area_m2'],'covering_parts':[n for n,_,_ in coverings]})
                else:
                    keep.append(face);partial_area+=area
            retained.append(keep)
            rows.append({'part':name,'original_box_bounds':box,'candidate_hiddenFaces_mask':mask,
                'retained_quads':len(keep),'candidate_triangles':2*len(keep),'removed_fully_covered_faces':remove,
                'component_is_closed':not remove})
        native_tri=len(parts)*12;candidate_tri=native_tri-removed*2
        assert candidate_tri==(64 if opened else 48)
        shell=cell_shell([b for _,b in parts]);topology=exact_union_topology(shell)
        decisions.append({'open':opened,'part_count':len(parts),'raw_native_triangles':native_tri,
            'candidate_triangles':candidate_tri,'triangle_reduction':native_tri-candidate_tri,
            'triangle_reduction_percent':100*(native_tri-candidate_tri)/native_tri,
            'raw_native_triangle_stream_vertices':native_tri*3,'candidate_triangle_stream_vertices':candidate_tri*3,
            'raw_native_position_normal_uv_float32_byte_estimate':native_tri*3*32,
            'candidate_position_normal_uv_float32_byte_estimate':candidate_tri*3*32,
            'indexed_reference_bytes_position_normal_uv_uint16_estimate':candidate_tri*2*32+candidate_tri*3*2,
            'fully_covered_faces_removed':removed,'fully_covered_surface_area_removed_m2':removed_area,
            'partially_buried_surface_area_retained_m2':partial_area,
            'union_volume_m3':shell['volume_m3'],'exact_external_surface_area_m2':shell['surface_area_m2'],
            'candidate_surface_area_including_retained_buried_m2':sum(f['area_m2'] for faces in retained for f in faces),
            'closed_shell_topology_reference':topology,'parts':rows,
            'render_only_component_candidate':True,'suitable_as_closed_MeshCollider':False})
        # Independently classify each complete union-grid exterior quad and
        # prove five interior samples are covered by a retained matching plane.
        for f in range(4):
            rotated=[rotated_box(b,f) for _,b in parts];union=cell_shell(rotated)
            kept=[]
            for partfaces in retained:
                for face in partfaces:
                    ps=[transform(p,f) for p in face['vertices']]
                    axis=next(a for a in range(3) if len({p[a] for p in ps})==1)
                    a,b,c=ps[:3];ab=[b[i]-a[i] for i in range(3)];ac=[c[i]-a[i] for i in range(3)];n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]
                    other=[k for k in range(3) if k!=axis]
                    kept.append({'axis':axis,'sign':1 if n[axis]>0 else -1,'plane':ps[0][axis],
                        'rect_min':tuple(min(p[k] for p in ps) for k in other),'rect_max':tuple(max(p[k] for p in ps) for k in other)})
            probes=failures=0
            for face in union['faces']:
                ps=[union['vertices_unity'][i] for i in face]
                axis=next(a for a in range(3) if len({p[a] for p in ps})==1)
                a,b,c=ps[:3];ab=[b[i]-a[i] for i in range(3)];ac=[c[i]-a[i] for i in range(3)];n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];sign=1 if n[axis]>0 else -1
                for u,v in ((.5,.5),(.13,.41),(.41,.87),(.79,.29),(.67,.61)):
                    p=tuple((1-u)*(1-v)*ps[0][k]+u*(1-v)*ps[1][k]+u*v*ps[2][k]+(1-u)*v*ps[3][k] for k in range(3));probes+=1
                    if not any(q['axis']==axis and q['sign']==sign and point_on_face(p,q) for q in kept):failures+=1
            assert failures==0,(opened,f,failures)
            assert all(0<=c<=1 for p in union['vertices_unity'] for c in p)
            statecases.append({'metadata':f|(8 if opened else 0),'facing':f,'open':opened,
                'candidate_triangles':candidate_tri,'external_boundary_samples':probes,'missing_external_surface_samples':failures,
                'unit_cell_bounds_verified':True,'compound_collision_box_bounds_unchanged_in_reference':True})
    source=ROOT/'historical/ArchitecturalShapes.cs'
    report={'study':'One catalog-backed class: FenceGate21, safe component interface-cap culling',
        'source_commit':'0956b0777cf007a7a3b1ed799f7ade777f14c80d','source_state':'historical',
        'source_paths_and_lines':{'ArchitecturalShapes.cs':'104-122 geometry; 159-194 existing hiddenFaces and collision append',
            'ChunkMeshGenerator.cs':'460-462 ArchitecturalShapes routing','VoxelBlockPhysics.cs':'11-13 shared collision boxes',
            'VoxelBlockInteraction.cs':'11-12 toggle eligibility; 38-83 endpoint/body-overlap checks'},
        'source_ArchitecturalShapes_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'actual_catalog_mapping_count':11,'catalog_mappings':mapping,
        'selected_asset':'minecraft:oak_fence_gate','state_count':8,'cost_decisions':decisions,'state_reference_cases':statecases,
        'preferred_next_candidate':'Render-only reusable box components with exact fully covered cap omission; retain original physics boxes',
        'component_reuse_templates':[{'name':'full box','triangles':12},
            {'name':'two opposite end caps omitted','triangles':8},
            {'name':'one end cap omitted','triangles':10}],
        'existing_API_observation':'Historical Model.Box already supports render-only hiddenFaces while collision bounds are appended independently; no API expansion is needed for these static local joins',
        'existing_API_inference':'Changing the FenceGate Box-call masks could implement this conservative reduction; this report does not change or execute those calls',
        'wall_gate':'22 catalog names use Wall4 but historical wall is one12tri strip, offset upper bit; no16-arm neighbor contract. Avoid duplicate simple-box production',
        'slope_gate':'Slope13 has renderer code but no mappings in the645-name historical catalog. Native palette use is outside this catalog evidence and unverified',
        'interfaces_not_implemented':['native C# hiddenFaces call changes','current revision compatibility','catalog tint/atlas/world shader','chunk boundary/neighbor culling','actual collision/navigation/body overlap','mobile/device/frame/memory measurement'],
        'no_Blender_or_render_executed':True,'project_source_modified':False,'Codex_invoked':False,
        'no_prefab_or_GameObject_per_piece':'If integrated, emit retained quads to the existing shared chunk buffer and material; do not create separate objects or draw calls per part',
        'measurement_boundary':'Triangles and retained exact quad arrays are reference geometry counts. Byte values assume32B float32 position/normal/UV and are arithmetic, not native allocation or GPU measurement',
        'full_block_accepted':False,'native_integrated':False,'mobile_pass':False}
    (OUT/'fencegate21-component-cap-cost-study.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'status':'8state exact exterior coverage reference pass',
        'closed':'60->48tri','open':'72->64tri','external_boundary_samples':sum(r['external_boundary_samples'] for r in statecases),
        'missing_external_surface_samples':sum(r['missing_external_surface_samples'] for r in statecases),
        'closed_exact_shell_floor':decisions[0]['closed_shell_topology_reference'],
        'open_exact_shell_floor':decisions[1]['closed_shell_topology_reference'],'native_integrated':False}))


if __name__=='__main__':main()
