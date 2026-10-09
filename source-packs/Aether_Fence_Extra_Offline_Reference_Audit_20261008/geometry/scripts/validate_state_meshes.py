"""Audit all 58 derived shape states as closed meshes; no extra exported assets."""
import bpy,bmesh,json,sys,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import ROOT,slab,stairs,fence,cell_shell
from build_shapes import to_blender,add_review_uv,audit

def optimized_state(boxes,family,native,keep_mesh=False):
    shell=cell_shell(boxes,spacing=.25)
    mesh=bpy.data.meshes.new('StateReference')
    mesh.from_pydata([to_blender(p) for p in shell['vertices_unity']],[],shell['faces']);mesh.update()
    add_review_uv(mesh,native,family)
    bm=bmesh.new();bm.from_mesh(mesh);bm.normal_update()
    uv=bm.loops.layers.uv.get('ReviewUV_2mRepeat_RailDirectional')
    for e in bm.edges:
        if len(e.link_faces)!=2:continue
        faces=[{l.vert:tuple(l[uv].uv) for l in f.loops if l.vert in e.verts} for f in e.link_faces]
        e.seam=any(abs(faces[0][v][a]-faces[1][v][a])>1e-6 for v in e.verts for a in range(2))
    planar=[e for e in bm.edges if len(e.link_faces)==2 and not e.seam and
            e.link_faces[0].normal.dot(e.link_faces[1].normal)>.999999]
    if planar:bmesh.ops.dissolve_edges(bm,edges=planar,use_verts=True,use_face_split=False)
    collinear=[]
    for v in bm.verts:
        if len(v.link_edges)==2:
            ds=[(e.other_vert(v).co-v.co).normalized() for e in v.link_edges]
            if ds[0].dot(ds[1])<-.999999:collinear.append(v)
    if collinear:bmesh.ops.dissolve_verts(bm,verts=collinear,use_face_split=False,use_boundary_tear=False)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:]);bm.to_mesh(mesh);bm.free();mesh.update()
    encoded=mesh.uv_layers.get('Historical_UV0_texId_DO_NOT_BIND')
    if encoded:mesh.uv_layers.remove(encoded)
    for p in mesh.polygons:p.use_smooth=False
    mat=bpy.data.materials.get('StateShared_'+family) or bpy.data.materials.new('StateShared_'+family)
    mesh.materials.append(mat)
    stats=audit(mesh,shell)
    if keep_mesh:return mesh,stats
    bpy.data.meshes.remove(mesh)
    return stats

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rows=[]
    for up in (False,True):
        s=optimized_state(slab(up),'stone',31)
        assert s['triangles']==12
        rows.append({'shape':'slab','up':up,'offline_mesh_gate':'pass','visual_state_review':'not_run',**s})
    for facing in range(4):
        for up in (False,True):
            for corner in ('straight','inner_left','inner_right','outer_left','outer_right'):
                s=optimized_state(stairs(facing,up,corner),'stone_bricks',35)
                rows.append({'shape':'stairs','facing':facing,'up':up,'corner':corner,
                             'offline_mesh_gate':'pass','visual_state_review':'not_run',**s})
    for mask in range(16):
        s=optimized_state(fence(mask),'oak_planks',33)
        rows.append({'shape':'fence','review_connection_mask':mask,
                     'offline_mesh_gate':'pass','visual_state_review':'not_run',**s})
    assert len(rows)==58
    by_kind={k:[r for r in rows if r['shape']==k] for k in ('slab','stairs','fence')}
    result={'source_state':'historical','source_commit':'0956b077','blender_version':bpy.app.version_string,
       'case_count':len(rows),'minimum_triangles':{k:min(r['triangles'] for r in v) for k,v in by_kind.items()},
       'maximum_triangles':{k:max(r['triangles'] for r in v) for k,v in by_kind.items()},
       'no_runtime_or_device_test':True,'visual_review_coverage':'Only three exported representatives receive visual review; these derived states are geometry-audit coverage only.',
       'cases':rows}
    (ROOT/'reports'/'state-mesh-audit.json').write_text(json.dumps(result,indent=2))
    print('RESULT '+json.dumps({'status':'58_state_meshes_pass','maximum_triangles':result['maximum_triangles']}),flush=True)

if __name__=='__main__':main()
