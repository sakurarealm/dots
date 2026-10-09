"""Exact rational study of the catalog-backed historic three-link Chain18 geometry."""
from fractions import Fraction as F
from pathlib import Path
from itertools import product
import json,sys,hashlib
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import cell_shell
ROOT=Path(__file__).resolve().parents[1]

def boxes():
    rows=[]
    for i in range(3):
        y=F(i,3); top=F(i+1,3)
        bs=[((F(26,64),y,F(30,64)),(F(29,64),top,F(34,64))),
            ((F(35,64),y,F(30,64)),(F(38,64),top,F(34,64))),
            ((F(29,64),y,F(30,64)),(F(35,64),y+F(3,64),F(34,64))),
            ((F(29,64),top-F(3,64),F(30,64)),(F(35,64),top,F(34,64)))]
        if i%2:bs=[((a[2],a[1],a[0]),(b[2],b[1],b[0])) for a,b in bs]
        rows.extend(bs)
    return rows

def transform(p,metadata):
    x,y,z=p; axis=(metadata>>4)&3
    return (y,1-x,z) if axis==1 else (x,1-z,y) if axis==2 else (x,y,z)

def ring_faces(link):
    # Each annular cap is four coplanar trapezoids,using only8 functional2Dcorners.
    # Outer/hole four edges are extruded,16 coordinate vertices total,32tri/link.
    y0=F(link,3); y1=F(link+1,3)
    outer=[(F(26,64),y0),(F(38,64),y0),(F(38,64),y1),(F(26,64),y1)]
    inner=[(F(29,64),y0+F(3,64)),(F(35,64),y0+F(3,64)),(F(35,64),y1-F(3,64)),(F(29,64),y1-F(3,64))]
    faces=[]
    def p(q,z):
        q=(q[0],q[1],z)
        return (q[2],q[1],1-q[0]) if link%2 else q
    for z,reverse in ((F(30,64),True),(F(34,64),False)):
        for j in range(4):
            k=(j+1)%4;f=[p(outer[j],z),p(outer[k],z),p(inner[k],z),p(inner[j],z)]
            faces.append(list(reversed(f)) if reverse else f)
    for loop,inside in ((outer,False),(inner,True)):
        for j in range(4):
            k=(j+1)%4;f=[p(loop[j],F(30,64)),p(loop[j],F(34,64)),p(loop[k],F(34,64)),p(loop[k],F(30,64))]
            faces.append(list(reversed(f)) if not inside else f)
    return faces

def area(box):
    lo,hi=box;a=[hi[i]-lo[i] for i in range(3)]
    return 2*(a[0]*a[1]+a[0]*a[2]+a[1]*a[2])

def main():
    out=ROOT/'cost_studies/chain18';out.mkdir(parents=True,exist_ok=True)
    cat=json.loads((ROOT.parent/'inventory/catalog_snapshot.json').read_text())
    entries=[r for r in cat['blocks'] if r['shape']==18]; assert len(entries)==1 and entries[0]['name']=='chain'
    raw=boxes(); rawarea=sum(map(area,raw)); volume=sum(product_volume(b) for b in raw)
    linkarea=F(287,512) #3 closed annular prisms,with2 shared contact caps retained at eachjoint
    assert rawarea==F(323,512) and volume==F(123,16384)
    interface=F(1,64);unionarea=linkarea-interface
    states=[]
    for meta in (0,16,32):
        rb=[(tuple(map(float,transform(b[0],meta))),tuple(map(float,transform(b[1],meta)))) for b in raw]
        rb=[(tuple(min(a[i],b[i]) for i in range(3)),tuple(max(a[i],b[i]) for i in range(3))) for a,b in rb]
        shell=cell_shell(rb)
        assert abs(shell['surface_area_m2']-float(unionarea))<1e-8
        assert abs(shell['volume_m3']-float(volume))<1e-10
        faces=[tuple(tuple(map(float,transform(p,meta))) for p in f) for i in range(3) for f in ring_faces(i)]
        assert len(faces)==48
        # Compare annular part containment and full union occupancy on every rational coordinate slab.
        axes=[sorted({p[a] for b in raw for p in b}) for a in range(3)]
        probes=fail=0
        for idx in product(*(range(len(a)-1) for a in axes)):
            p=tuple((axes[a][idx[a]]+axes[a][idx[a]+1])/2 for a in range(3)); expect=any(all(lo[a]<p[a]<hi[a] for a in range(3)) for lo,hi in raw)
            got=False
            for i in range(3):
                x,y,z=p if not i%2 else (p[2],p[1],p[0])
                solid=(F(26,64)<x<F(38,64) and F(i,3)<y<F(i+1,3) and F(30,64)<z<F(34,64)
                       and not(F(29,64)<x<F(35,64) and F(i,3)+F(3,64)<y<F(i+1,3)-F(3,64)))
                got=got or solid
            fail+=expect!=got;probes+=1
        assert fail==0
        states.append({'metadata':meta,'axis':{0:'Y',16:'X',32:'Z'}[meta],'raw_rotated_boxes':rb,
            'union_volume_m3':shell['volume_m3'],'union_external_area_m2':shell['surface_area_m2'],'occupancy_slab_samples':probes,'occupancy_failures':fail})
    report={'study':'Chain18: three reusable closed annular-link parts in one batched state mesh',
        'historical_commit':'0956b0777cf007a7a3b1ed799f7ade777f14c80d','catalog':entries[0],
        'historical_tex_id':368+entries[0]['sourceId']-122,'tex_id_computation_note':'Actual texId is independently pinned below; sourceId is not sequential palette index.',
        'actual_mapping_tex_id':556,'raw_box_count':12,'raw_triangles':144,
        'full_covered_cap_only_triangles':120,'three_closed_link_triangles':96,
        'triangles_per_link':32,'functional_coordinate_vertices_per_link':16,
        'closed_parts_per_state':3,'all_links_welded_exact_union':False,
        'single_batched_mesh_material_per_axis_state':True,'per_link_renderer_design':False,
        'candidate_versus_raw_reduction_percent':100*(144-96)/144,
        'raw_box_emitted_area_m2':float(rawarea),'candidate_part_area_m2':float(linkarea),
        'residual_interlink_buried_cap_area_m2':float(interface),'exact_union_area_m2':float(unionarea),
        'union_volume_m3':float(volume),'axis_cases':states,
        'metadata_reserved48_falls_back_Y':True,'facing_open_upper_ignored_by_chain_transform':True,
        'collider_reference':'Original12boxes unchanged/separate; geometry not a runtime collisiontest',
        'material_reference':'existing approved standalone iron_block_v02 exact512 map; no new artwork',
        'shader_gate':'Historical BK family3 override bypasses authored iron; explicit target shader adaptation required',
        'native_UV0_world_phase_tint_shader_integrated':False,'full_block_accepted':False,'native_integrated':False,'mobile_pass':False}
    # No fabricated texId formula: exact palette snapshot states mapping texId556.
    report.pop('historical_tex_id');report.pop('tex_id_computation_note')
    (out/'chain18-closed-link-cost-study.json').write_text(json.dumps(report,indent=2)+'\n')
    (out/'CHAIN18_CLOSED_LINK_COST.md').write_text('''# Chain18 next-shape cost decision

The real catalog chain uses shape18,metal family3. Historical0956b077 emits12boxes/144tri in three alternating rectangular links. A conservative full-covered-cap-only candidate is120tri; a32tri closed annular prism per link gives96tri for three reusable closed parts,one batched mesh/material,33.33% below raw. There is no renderer per link.

Do not weld the three links into a complicated union merely to delete tiny partially covered joint caps. Their two crossing interfaces retain0.015625m2 buried cap area. Each link is individually closed/genus1; the three-part dataset is not a welded exact outer union. Original twelve collision boxes remain separate/unchanged and runtime collision is untested.

Actual meaningful axes are metadata0(Y),16(X),32(Z). Chain transform returns early,ignores facing/open/upper. Reserved48 falls backY,not another axis state. Three occupancy slab tests match the twelve-box union exactly. See JSON for per-axis measured rational study.

Use the existing approved iron v02 only as an unchanged standalone art reference. Historical BK family3 overrides authored albedo,so target-shader adaptation is a blocker. Proposed axis-rotated2m review UV is not native texIdUV or native world mapping. Current engine/native/chunks/physics/Unity/phone remain open. No source adapter is implemented.
''')
    print(json.dumps({k:report[k] for k in ('raw_triangles','full_covered_cap_only_triangles','three_closed_link_triangles','candidate_versus_raw_reduction_percent','raw_box_emitted_area_m2','candidate_part_area_m2','residual_interlink_buried_cap_area_m2','exact_union_area_m2','union_volume_m3')}))

def product_volume(b):return (b[1][0]-b[0][0])*(b[1][1]-b[0][1])*(b[1][2]-b[0][2])
if __name__=='__main__':main()
