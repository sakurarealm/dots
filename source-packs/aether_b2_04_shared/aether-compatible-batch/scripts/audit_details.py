"""Additional component-normal and UV-area checks against actual saved meshes."""
import bpy,bmesh,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def mesh_details(ob):
    me=ob.data;bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table();seen=set();volumes=[]
    for first in bm.faces:
        if first.index in seen:continue
        todo=[first];comp=[]
        while todo:
            f=todo.pop()
            if f.index in seen:continue
            seen.add(f.index);comp.append(f)
            for edge in f.edges:todo.extend(g for g in edge.link_faces if g.index not in seen)
        vol=0.
        for f in comp:
            v=[a.co for a in f.verts]
            for i in range(1,len(v)-1):vol+=v[0].dot(v[i].cross(v[i+1]))/6
        volumes.append(vol)
    bm.free();uv=me.uv_layers.active;zero=0;minarea=1e10
    for p in me.polygons:
        ps=[uv.data[i].uv for i in p.loop_indices]
        area=0.
        for i in range(1,len(ps)-1):
            a=ps[i]-ps[0];b=ps[i+1]-ps[0];area+=abs(a.x*b.y-a.y*b.x)/2
        if area<1e-10:zero+=1
        minarea=min(minarea,area)
    return {'name':ob.name,'material_triangles':{mat.name:sum(len(p.vertices)-2 for p in me.polygons if p.material_index==i) for i,mat in enumerate(me.materials)},'retained_hardware_triangles':ob.get('aether_retained_hardware_and_canvas_triangles'),'closed_component_count':len(volumes),'negative_or_zero_volume_components':sum(v<=1e-12 for v in volumes),'min_component_volume_m3':min(volumes),'zero_uv_area_faces':zero,'uv_face_count':len(me.polygons),'min_uv_area':minarea}

allreports=[]
for src in sorted((ROOT/'source').glob('*.blend')):
    bpy.ops.wm.open_mainfile(filepath=str(src));meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('LOD')]
    results=[mesh_details(o) for o in meshes];print(src.stem,results)
    assert all(r['negative_or_zero_volume_components']==0 and r['zero_uv_area_faces']==0 for r in results),results
    static=[r for r in results if r['name'].endswith('_Static')]
    original=next(r for r in static if r['name']=='LOD0_Static')
    for r in static:
        for material,triangles in original['material_triangles'].items():
            if material!='MAT_Wood_Warm':assert r['material_triangles'][material]==triangles,(src.stem,r,material)
    allreports.append({'asset_id':src.stem,'mesh_details':results,'protected_nonwood_lod_triangles_match':True})
(ROOT/'reports'/'component-normal-uv-report.json').write_text(json.dumps(allreports,indent=2))
