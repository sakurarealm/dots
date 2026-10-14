import bpy,json,hashlib,shutil
from pathlib import Path
from mathutils import Vector
O=Path(__file__).resolve().parents[1];ROOT=O.parent;OLD=O/'rollback/kitchen.sink.glb';NEW=O/'modules/kitchen.sink.glb';audit=json.loads((O/'validation/original-render-evidence.json').read_text());rows=[];checks=[]
for revision,src in [('r02',OLD),('r03',NEW)]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(src));obs=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(obs)==1;mesh=obs[0];pts=[mesh.matrix_world@Vector(c) for c in mesh.bound_box];lo=Vector(tuple(min(p[k] for p in pts) for k in range(3)));hi=Vector(tuple(max(p[k] for p in pts) for k in range(3)));center=(lo+hi)/2
 rays=[]
 for name,point,direction in [('outlet_center_up',(.37,.03,1.58),(0,0,1)),('rim_up',(.3795,.03,1.58),(0,0,1)),('inner_wall_positive_x',(.37,.03,1.61),(1,0,0)),('inner_wall_negative_x',(.37,.03,1.61),(-1,0,0))]:
  hit,loc,norm,face=mesh.ray_cast(Vector(point),Vector(direction));rays.append({'name':name,'hit':hit,'locationSourceZUp':list(loc) if hit else None,'normal':list(norm) if hit else None,'faceIndex':face})
 mesh.data.calc_loop_triangles();zero=sum(1 for t in mesh.data.loop_triangles if t.area<1e-12)
 checks.append({'revision':revision,'inputSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'boundsMin':list(lo),'boundsMax':list(hi),'rays':rays,'triangles':len(mesh.data.loop_triangles),'nearZeroTriangleAreasBelow1e-12':zero})
 if revision=='r03':
  assert abs(rays[0]['locationSourceZUp'][2]-1.645)<1e-5;assert abs(rays[1]['locationSourceZUp'][2]-1.59)<1e-5;assert abs(rays[2]['locationSourceZUp'][0]-.378)<1e-5;assert abs(rays[3]['locationSourceZUp'][0]-.362)<1e-5
  group=mesh.vertex_groups.new(name='r03 outlet rim and inner cavity')
  ids=[v.index for v in mesh.data.vertices if abs(v.co.x-.37)<=.01101 and abs(v.co.y-.03)<=.01101 and 1.58999<=v.co.z<=1.64501];group.add(ids,1,'REPLACE')
  bpy.ops.file.pack_all();bpy.ops.file.make_paths_relative();bpy.ops.wm.save_as_mainfile(filepath=str(O/'source/kitchen.sink-r03-editable.blend'))
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=32;s.cycles.use_denoising=False;s.render.threads_mode='FIXED';s.render.threads=2;s.render.resolution_x=1100;s.render.resolution_y=1000;s.render.resolution_percentage=100
 s.world=bpy.data.worlds.new('Audit ambient');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.32,.32,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.8
 for n,delta,power,size in [('Key',(-3,-4,5),600,4),('Fill',(4,-1,3),450,3),('Back',(0,3,4),500,3)]:
  d=bpy.data.lights.new(n,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(n,d);s.collection.objects.link(o);o.location=center+Vector(delta);o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',d);s.collection.objects.link(cam);s.camera=cam;d.type='ORTHO';d.clip_start=.001
 views=[]
 for v in audit['views']:views.append({'name':v['image'].replace('.png',''),'location':v['camera_location_zup'],'rotation':v['rotation_euler'],'scale':v['ortho_scale']})
 for name,pos,target,scale in [('mouth-oblique',(.12,-.32,1.38),(.37,.03,1.615),.18),('mouth-axial',(.37,.03,1.42),(.37,.03,1.615),.11)]:
  rotation=(Vector(target)-Vector(pos)).to_track_quat('-Z','Y').to_euler();views.append({'name':name,'location':pos,'rotation':list(rotation),'scale':scale})
 for v in views:
  cam.location=v['location'];cam.rotation_euler=v['rotation'];d.ortho_scale=v['scale'];s.render.filepath=str(O/'previews'/f"{v['name']}-{revision}.png");bpy.ops.render.render(write_still=True);rows.append({'file':Path(s.render.filepath).name,'inputSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'camera':v,'hiddenGeometry':False,'sha256':hashlib.sha256(Path(s.render.filepath).read_bytes()).hexdigest()});(O/'validation/render-manifest.json').write_text(json.dumps(rows,indent=2))
assert checks[0]['boundsMin']==checks[1]['boundsMin'] and checks[0]['boundsMax']==checks[1]['boundsMax'];assert abs(checks[0]['rays'][0]['locationSourceZUp'][2]-1.59)<1e-5
(O/'validation/readback-and-opening.json').write_text(json.dumps({'checks':checks,'boundsExact':True,'originalBottomCapReplacedByRealCavity':True,'centerRayCavityDepthMetres':checks[1]['rays'][0]['locationSourceZUp'][2]-checks[0]['rays'][0]['locationSourceZUp'][2],'fluidSystemValidated':False},indent=2));print('REVIEW_RENDER_COMPLETE')
