"""Real FBX/GLB re-import check in Blender. Not a Unity or device test."""
import bpy,bmesh,json,pathlib,math,sys,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1];reports=[]
for f in sorted((ROOT/'exports').glob('*')):
 if f.suffix not in ['.glb','.fbx']:continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 if f.suffix=='.glb':bpy.ops.import_scene.gltf(filepath=str(f))
 else:bpy.ops.import_scene.fbx(filepath=str(f))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];coords=[];tri=0;uvloops=0;zero=0;nonmanifold=0;slots=[];packed=[]
 for o in meshes:
  o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles);coords.extend([o.matrix_world@v.co for v in o.data.vertices]);uvloops+=len(o.data.uv_layers.active.data) if o.data.uv_layers.active else 0;slots.extend([m.name for m in o.data.materials]);bm=bmesh.new();bm.from_mesh(o.data);zero+=sum(p.calc_area()<1e-10 for p in bm.faces);nonmanifold+=sum(not e.is_manifold for e in bm.edges);bm.free()
 for im in bpy.data.images:
  if im.source=='FILE':packed.append({'name':im.name,'dimensions':list(im.size),'packed':bool(im.packed_file),'exists_or_packed':bool(im.packed_file) or pathlib.Path(bpy.path.abspath(im.filepath)).exists()})
 bounds={'min':[min(v[i] for v in coords) for i in range(3)],'max':[max(v[i] for v in coords) for i in range(3)]};dim=[bounds['max'][i]-bounds['min'][i] for i in range(3)]
 reports.append({'file':str(f.relative_to(ROOT)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size,'mesh_objects':len(meshes),'triangles':tri,'material_slots':slots,'bounds_m':bounds,'dimensions_m':dim,'origin_points_world_m':[list(o.matrix_world.translation) for o in meshes],'uv_loops':uvloops,'zero_area_faces':zero,'nonmanifold_edges':nonmanifold,'textures':packed,'pass':tri>0 and zero==0 and uvloops>0 and all(x['exists_or_packed'] for x in packed)})
(ROOT/'reports/export_roundtrip.json').write_text(json.dumps({'scope':'Actual Blender 4.3.2 FBX and GLB importer roundtrip only. Unity importer/runtime, project shader, collision/gameplay/phone budgets untested.','records':reports},indent=2));print(json.dumps(reports,indent=2))
