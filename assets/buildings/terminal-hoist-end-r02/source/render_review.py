import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
O=Path(__file__).resolve().parents[1];R=O.parent;audit=json.loads((O/'validation/original-render-evidence.json').read_text());rows=[]
for level,revision in [(4,'r02'),(5,'r02')]:
 src=O/'stages'/f'L{level}.glb';bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(src));root=bpy.data.objects['MOD_cargo.hoist']
 if level==4:
  bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
  for o in root.children_recursive:o.select_set(True)
  bpy.ops.export_scene.gltf(filepath=str(O/'modules/cargo.hoist.r02.glb'),use_selection=True,export_format='GLB',export_extras=True)
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=16;s.cycles.use_denoising=False;s.render.threads_mode='FIXED';s.render.threads=2;s.render.resolution_x=1100;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.world=bpy.data.worlds.new('Ambient');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.35,.35,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.8
 target=Vector((-10.2,5.8,9.7))
 for n,pos,power,size in [('Key',(-13,10,14),1100,6),('Fill',(-6,8,11),700,5)]:
  d=bpy.data.lights.new(n,'AREA');d.energy=power;d.size=size;o=bpy.data.objects.new(n,d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('Review');cam=bpy.data.objects.new('Review',d);s.collection.objects.link(cam);s.camera=cam;d.type='ORTHO';d.clip_start=.001
 views=[{'name':v['image'].replace('.png',''),'location':v['camera_location_zup'],'rotation':v['rotation_euler'],'scale':v['ortho_scale']} for v in audit['views']]
 for name,pos,t,scale in [('end-front',(-10.05,7.0,8.65),(-10.15,5.8,8.47),.78),('end-side',(-11.4,6.1,8.68),(-10.15,5.8,8.47),.78)]:views.append({'name':name,'location':pos,'rotation':list((Vector(t)-Vector(pos)).to_track_quat('-Z','Y').to_euler()),'scale':scale})
 for v in views:
  cam.location=v['location'];cam.rotation_euler=v['rotation'];d.ortho_scale=v['scale'];s.render.filepath=str(O/'previews'/f'L{level}-{v["name"]}-{revision}.png');bpy.ops.render.render(write_still=True);rows.append({'file':Path(s.render.filepath).name,'inputSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'camera':v,'hiddenGeometry':False,'sha256':hashlib.sha256(Path(s.render.filepath).read_bytes()).hexdigest()});(O/'validation/render-manifest.json').write_text(json.dumps(rows,indent=2))
print('DONE')
