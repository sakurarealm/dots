import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
O=Path(__file__).resolve().parents[1];rows=[]
for level in range(1,6):
 for revision in (['r02','r03'] if level in [1,5] else ['r03']):
  src=O/('rollback' if revision=='r02' else 'stages')/f'L{level}.glb';bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(src));sink=bpy.data.objects['station.wash'];s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=24;s.cycles.use_denoising=False;s.render.threads_mode='FIXED';s.render.threads=2;s.render.resolution_x=1100;s.render.resolution_y=1000;s.render.resolution_percentage=100
  s.world=bpy.data.worlds.new('Ambient');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.4,.4,.4,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.6
  target=sink.matrix_world@Vector((0,0,1.15))
  for n,pos,power in [('Key',(2,2,2.8),700),('Fill',(1,4,2.5),400)]:
   d=bpy.data.lights.new(n,'AREA');d.energy=power;d.size=2;o=bpy.data.objects.new(n,d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
  d=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',d);s.collection.objects.link(cam);s.camera=cam;d.type='ORTHO';d.clip_start=.001
  views=[('installation',(2.3,2.75,1.8),tuple(target),1.9)]
  if level in [1,5]:
   p=sink.matrix_world@Vector((.12,-.32,1.38));t=sink.matrix_world@Vector((.37,.03,1.615));views.append(('mouth-close',tuple(p),tuple(t),.18))
  for name,pos,t,scale in views:
   cam.location=pos;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();d.ortho_scale=scale;s.render.filepath=str(O/'previews'/f'L{level}-{name}-{revision}.png');bpy.ops.render.render(write_still=True);rows.append(dict(file=Path(s.render.filepath).name,inputSha256=hashlib.sha256(src.read_bytes()).hexdigest(),cameraSourceZUp=pos,targetSourceZUp=t,orthoScale=scale,hiddenGeometry=False,sha256=hashlib.sha256(Path(s.render.filepath).read_bytes()).hexdigest()));(O/'validation/render-manifest.json').write_text(json.dumps(rows,indent=2))
print('DONE')
