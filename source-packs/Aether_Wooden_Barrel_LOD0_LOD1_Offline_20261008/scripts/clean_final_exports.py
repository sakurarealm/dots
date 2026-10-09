import bpy,pathlib,json
ROOT=pathlib.Path(__file__).resolve().parents[1]
for stem in ['aether_wooden_barrel_v01','aether_wooden_barrel_v01_LOD1']:
 f=ROOT/'source'/(stem+'.blend')
 if not f.exists():continue
 bpy.ops.wm.open_mainfile(filepath=str(f));o=bpy.data.objects[stem]
 for l in list(o.data.uv_layers):
  if l.name!='UV0':o.data.uv_layers.remove(l)
 o.data.uv_layers.active=o.data.uv_layers['UV0']
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.wm.save_as_mainfile(filepath=str(f))
 bpy.ops.export_scene.fbx(filepath=str(ROOT/'exports'/(stem+'.fbx')),use_selection=True,object_types={'MESH'},apply_unit_scale=True,global_scale=1.0,axis_forward='-Z',axis_up='Y',use_mesh_modifiers=True,mesh_smooth_type='FACE',path_mode='COPY',embed_textures=True,add_leaf_bones=False,bake_anim=False)
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'exports'/(stem+'.glb')),export_format='GLB',use_selection=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_yup=True,export_animations=False)
 mf=ROOT/'reports'/('barrel'+('_lod1' if stem.endswith('LOD1') else '')+'_manifest.json')
 if mf.exists():d=json.loads(mf.read_text());d['uv']['layers']=['UV0'];d['uv']['layout']='Active UV0 has intentionally repeated/overlapping directional wood islands; unused primitive UVMap removed from production source/exports. Frozen sample carrier left unchanged.';mf.write_text(json.dumps(d,indent=2))
 print('CLEANED',stem)
