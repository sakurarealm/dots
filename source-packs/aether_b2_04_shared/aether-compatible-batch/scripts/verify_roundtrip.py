import bpy,bmesh,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]

def metrics(objects):
    bpy.context.view_layer.update()
    vertices=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
    dims=[max(v[i] for v in vertices)-min(v[i] for v in vertices) for i in range(3)]
    return {'dimensions_xyz_m':dims,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects),'mesh_count':len(objects),'uv_complete':all(o.data.uv_layers.active is not None for o in objects),'material_slots_max':max(len(o.data.materials) for o in objects),'finite':all(math.isfinite(x) for v in vertices for x in v)}

def main():
    allresults=[]
    for src in sorted((ROOT/'source').glob('*.blend')):
        asset=src.stem;bpy.ops.wm.open_mainfile(filepath=str(src))
        before=metrics([o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('LOD0')])
        results={'asset_id':asset,'source':before,'formats':{}}
        for ext in ['fbx','glb']:
            bpy.ops.wm.read_factory_settings(use_empty=True)
            p=ROOT/'exports'/asset/(asset+'.'+ext)
            if ext=='fbx':bpy.ops.import_scene.fbx(filepath=str(p),use_custom_normals=True)
            else:bpy.ops.import_scene.gltf(filepath=str(p))
            meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('LOD0')]
            actual=metrics(meshes);actual['dimension_max_error_m']=max(abs(a-b) for a,b in zip(actual['dimensions_xyz_m'],before['dimensions_xyz_m']))
            actual['triangle_difference']=actual['triangles']-before['triangles']
            actual['pass']=actual['dimension_max_error_m']<.001 and actual['triangle_difference']==0 and actual['uv_complete'] and actual['finite'] and actual['material_slots_max']<=3
            # Check real pivot matrices too, especially the workbench's separate moving pieces.
            actual['moving_part_pivots']=[{'name':o.name,'translation_xyz_m':list(o.matrix_world.translation)} for o in bpy.context.scene.objects if o.type=='EMPTY' and 'Pivot' in o.name]
            actual['texture_images_found']=[{'name':im.name,'size':list(im.size),'has_pixels':im.has_data} for im in bpy.data.images if im.type!='RENDER_RESULT']
            results['formats'][ext]=actual;assert actual['pass'],results
        results['pass']=True;allresults.append(results)
        reportpath=ROOT/'reports'/(asset+'.json');report=json.loads(reportpath.read_text());report['roundtrip']=results;report['status']='technical_export_pass_pending_visual_and_unity';reportpath.write_text(json.dumps(report,ensure_ascii=False,indent=2))
        print('ROUNDTRIP_PASS',asset)
    (ROOT/'reports'/'roundtrip-report.json').write_text(json.dumps(allresults,ensure_ascii=False,indent=2));print('VERIFY_COMPAT_EXPORTS_PASS')

if __name__=='__main__':main()
