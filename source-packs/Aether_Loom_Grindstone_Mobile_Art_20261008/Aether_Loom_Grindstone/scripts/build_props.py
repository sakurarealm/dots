#!/usr/bin/env python3
"""Rebuild isolated Aether-style functional prop candidates with Blender 4.3.2.
Run: blender -b --factory-startup -t 2 --python-exit-code 1 --python scripts/build_props.py -- --asset grindstone --revision sample
No project, Unity or shader integration occurs. Exportable meshes use Principled bridge.
"""
import bpy, bmesh, math, json, sys, os, hashlib, datetime, shutil, threading, time
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
ARGS=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
ASSET=ARGS[ARGS.index('--asset')+1] if '--asset' in ARGS else 'grindstone'
REV=ARGS[ARGS.index('--revision')+1] if '--revision' in ARGS else 'final'
OUT=ROOT/ASSET/REV; OUT.mkdir(parents=True,exist_ok=True)
RECIPE=json.load(open(ROOT/'recipes'/(ASSET+'.json')))
# Fail early on low resources; the orchestration should wait and retry safely.
meminfo=Path('/proc/meminfo')
if meminfo.exists():
 available_kib=int(next(x.split()[1] for x in meminfo.read_text().splitlines() if x.startswith('MemAvailable:')))
 if available_kib<2*1024**2:raise RuntimeError('Resource gate: MemAvailable below 2 GiB; wait before rebuilding')
if shutil.disk_usage(ROOT).free<3*1024**3:raise RuntimeError('Resource gate: less than 3 GiB free disk; wait before rebuilding')
S=bpy.context.scene; bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for b in list(bpy.data.materials): bpy.data.materials.remove(b)
S.unit_settings.system='METRIC';S.unit_settings.scale_length=1
S.render.engine='CYCLES'; S.cycles.device='CPU'; S.cycles.samples=48 if REV=='sample' else 64; S.cycles.use_denoising=False
S.render.threads_mode='FIXED';S.render.threads=2;S.render.image_settings.file_format='PNG'; S.view_settings.view_transform='AgX'
S.world.color=(.35,.35,.35)
W=bpy.data.worlds.new('Studio_World');S.world=W;W.use_nodes=True;W.node_tree.nodes['Background'].inputs['Color'].default_value=(.38,.43,.42,1);W.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
COL=bpy.data.collections.new('ASSET');S.collection.children.link(COL)
STUDIO=bpy.data.collections.new('RENDER_STUDIO');S.collection.children.link(STUDIO)
parts=[]; materials={}

def status(stage,event=None,outputs=None):
 p=ROOT/'status.json'; old=json.loads(p.read_text()) if p.exists() else {};now=datetime.datetime.now(datetime.timezone.utc).isoformat();old.update(heartbeat_at_utc=now,updated_at_utc=now,stage=stage,stage_zh=('织布机' if ASSET=='loom' else '磨石')+'：'+stage.replace('grindstone','').replace('loom','').replace('final','最终版').replace('sample','首样').replace('rendered','已渲染').replace('geometry building','建模中').replace('exported; rendering review views','已导出，正在渲染审阅视图').replace('ready for visual inspection','等待视觉审查').strip(),state='running')
 if outputs is not None:
  old['outputs']=[{'path':str(ROOT/x),'purpose':'资产输出目录，待汇总正式文件'} for x in outputs]
 q=p.with_suffix('.tmp');q.write_text(json.dumps(old,indent=2));q.replace(p)
 if event:
  with (ROOT/'events.jsonl').open('a') as f:f.write(json.dumps({'at_utc':now,'event':event,'detail':stage})+'\n')

def mat(name,color,texture=None,metal=0,rough=.78):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if texture:
  im=bpy.data.images.load(str(ROOT/'textures'/texture),check_existing=True);im.colorspace_settings.name='sRGB';im.pack();t=m.node_tree.nodes.new('ShaderNodeTexImage');t.name='Shared_Approved_BaseColor';t.image=im;t.interpolation='Linear';m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 materials[name]=m;return m
wood=mat('Aether_Shared_WarmWood',(.42,.23,.10),'T_Wood_Warm_BaseColor.png')
wooddark=mat('Aether_Wood_Endgrain_Dark',(.22,.115,.051))
brass=mat('Aether_Shared_MatteBrass',(.52,.34,.10),'T_Metal_Brass_BaseColor.png',metal=.45,rough=.44)
stone=mat('Aether_Grindstone_WarmGrey',(.32,.35,.32) if REV=='final' else (.42,.44,.40))
stoneside=mat('Aether_Grindstone_Face',(.395,.425,.385) if REV=='final' else (.49,.515,.47))
iron=mat('Aether_Axle_Charcoal',(.12,.15,.145),metal=.4,rough=.5)
cloth=mat('Aether_Shared_MossCanvas',(.19,.38,.24),'T_Cloth_Canvas_BaseColor.png')
yarn=mat('Aether_Linen_Warp',(.67,.60,.42))

def put(o,name,m,parent=None):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 COL.objects.link(o)
 if m:o.data.materials.append(m)
 if parent:o.parent=parent
 if o.type=='MESH':parts.append(o)
 return o

def empty(name,loc,parent=None):
 o=bpy.data.objects.new(name,None);COL.objects.link(o);o.location=loc;o.empty_display_type='PLAIN_AXES';o.empty_display_size=.10
 if parent:o.parent=parent
 return o
root=empty('Aether_'+ASSET.title()+'_Root',(0,0,0));root['unit']='metres';root['status']='standalone art candidate; no current project compliance claimed'

def cube(name,loc,size,m,bevel=0,parent=root):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Mobile_OneSegment_Bevel','BEVEL');mod.width=bevel;mod.segments=1;mod.affect='EDGES';bpy.ops.object.modifier_apply(modifier=mod.name)
 return put(o,name,m,parent)

def beam(name,a,b,width,depth,m=wood,bevel=.01,parent=root):
 a=Vector(a);b=Vector(b);o=cube(name,(a+b)/2,(width,depth,(b-a).length),m,bevel,parent);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def cyl(name,loc,radius,depth,m,axis='Z',n=12,parent=root):
 bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=radius,depth=depth,end_fill_type='NGON',location=loc);o=bpy.context.object
 if axis=='X':o.rotation_euler[1]=math.pi/2
 elif axis=='Y':o.rotation_euler[0]=math.pi/2
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);return put(o,name,m,parent)

def wheel(name,loc,radius,width,n=24,parent=root):
 # Actual low-poly chamfered stone volume; axis X. Caps remain closed.
 rings=[(-width/2,radius*.94),(-width/2+.022,radius),(width/2-.022,radius),(width/2,radius*.94)]
 v=[(x+loc[0],math.sin(2*math.pi*i/n)*r+loc[1],math.cos(2*math.pi*i/n)*r+loc[2]) for x,r in rings for i in range(n)]
 f=[]
 for j in range(len(rings)-1):
  for i in range(n):k=(i+1)%n;f.append((j*n+i,j*n+k,(j+1)*n+k,(j+1)*n+i))
 f+=[tuple(range(n-1,-1,-1)),tuple(3*n+i for i in range(n))]
 me=bpy.data.meshes.new(name+'_Mesh');me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);COL.objects.link(o);o.parent=parent;o.data.materials.append(stone);o.data.materials.append(stoneside)
 for p in me.polygons:p.material_index=1 if len(p.vertices)==n else 0
 parts.append(o);return o

def finish_uv():
 for o in parts:
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.02,area_weight=.4,correct_aspect=True,scale_to_bounds=True);bpy.ops.object.mode_set(mode='OBJECT')
  for p in o.data.polygons:p.use_smooth=False
  # Long-grain style is historical reference; UV mapping gives broad low-frequency texture.

def make_grindstone():
 pivot=empty('Grindstone_Rotation_Pivot',(0,.04,.86),root);pivot['rotation_axis_local']='X';pivot['purpose']='optional wheel+crank animation pivot; no animation code'
 for x in [-.30,.30]:
  cube('Foot_'+('L' if x<0 else 'R'),(x,0,.065),(.20,.66,.13),wood,.018)
  beam('Splayed_Support_'+('L' if x<0 else 'R'),(x,0,.13),(x*.84,.04,.86),.14,.18)
  cube('Axle_Bearing_'+('L' if x<0 else 'R'),(x*.84,.04,.86),(.16,.20,.14),wooddark,.012)
  cyl('Bearing_Cap_'+('L' if x<0 else 'R'),(x*.84+(-.081 if x<0 else .081),.04,.86),.073,.026,brass,'X',12)
 cube('Lower_Crossbeam',(0,.14,.24),(.70,.10,.12),wood,.01)
 cube('Front_Brace',(0,-.21,.27),(.66,.10,.10),wood,.01)
 # Water tray under wheel: raised wooden walls and dark recessed interior.
 cube('Tray_Floor',(0,.04,.49),(.47,.48,.055),wooddark,.008)
 for y in [-.205,.285]:cube('Tray_Rim_'+str(y),(0,y,.55),(.49,.045,.10),wood,.008)
 for x in [-.235,.235]:cube('Tray_End_'+str(x),(x,.04,.55),(.045,.43,.10),wood,.008)
 wheel('Grinding_Stone',(0,.04,.86),float(RECIPE.get('wheel_radius',.30)),float(RECIPE.get('wheel_width',.29)),int(RECIPE.get('wheel_segments',24)))
 cyl('Iron_Axle',(0,.04,.86),.028,.82,iron,'X',12)
 for x in [-.157,.157]:cyl('Stone_Hub_'+str(x),(x,.04,.86),.084,.028,brass,'X',12)
 # Crank arm and handle at right, can share rotation pivot.
 beam('Crank_Arm',(.45,.04,.86),(.45,-.125,.735),.055,.055,brass,.005)
 cyl('Crank_Handle',(.515,-.125,.735),.038,.17,wooddark,'X',10)
 for o in parts:
  if o.name.startswith(('Grinding','Iron_Axle','Stone_Hub','Crank')):
   mw=o.matrix_world.copy();o.parent=pivot;o.matrix_world=mw
 if REV=='final':
  # Directed revision: worker-facing tool rest and stronger stone/end-cap readability.
  cube('Tool_Rest_Platform',(0,-.278,.828),(.36,.085,.035),iron,.005)
  for x in [-.135,.135]:beam('Tool_Rest_Bracket_'+str(x),(x,-.235,.53),(x,-.278,.812),.035,.035,iron,.003)
  for x in [-.205,.205]:cyl('Bearing_Fixing_Pin_'+str(x),(x,.04,.928),.018,.013,brass,'Z',8)
 empty('Action_Position',(0,-.78,0),root)['purpose']='suggested operator standing location; IK/collision not tested'
 empty('Tool_Contact',(0,-.255,.845),root)['purpose']='contact reference only'

def strip_mesh(name,xvals,path,width,m):
 # Solid low-poly ribbon following a path in YZ, split into X spans.
 for i,x in enumerate(xvals):
  vs=[]
  for y,z in path:vs.extend([(x-width/2,y,z),(x+width/2,y,z)])
  fs=[]
  for j in range(len(path)-1):fs.append((2*j,2*j+1,2*j+3,2*j+2))
  me=bpy.data.meshes.new(name+str(i)+'Mesh');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name+str(i),me);COL.objects.link(o);o.parent=root;o.data.materials.append(m);parts.append(o)
  mod=o.modifiers.new('Ribbon_Thickness','SOLIDIFY');mod.thickness=.004;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)

def make_loom():
 # Floor-standing treadle loom, approx 1.10m wide x 0.80m deep x 1.36m high.
 for x in [-.46,.46]:
  cube('Loom_Sled_'+str(x),(x,0,.065),(.17,.91,.13),wood,.014)
  for y,z in [(.28,1.32),(-.29,.91)]:beam('Loom_Post_'+str(x)+'_'+str(y),(x,y,.13),(x,y,z),.105,.105,wood,.01)
  beam('Side_Diagonal_'+str(x),(x,.28,.17),(x,-.29,.79),.07,.07,wood,.008)
  beam('Side_Warp_Rail_'+str(x),(x,-.29,.86),(x,.28,1.24),.075,.075,wood,.006)
 cube('Rear_Top_Beam',(0,.28,1.295),(1.045,.13,.13),wood,.014)
 cube('Lower_Tie_Beam',(0,.18,.255),(1.01,.10,.12),wood,.01)
 cube('Front_Chest_Beam',(0,-.315,.855),(1.07,.14,.11),wood,.013)
 cyl('Warp_Beam',(0,.29,1.135),.057,.89,wooddark,'X',12)
 cyl('Cloth_Beam',(0,-.28,.62),.080,.89,wooddark,'X',12)
 for x in [-.52,.52]:
  for y,z in [(.29,1.135),(-.28,.62)]:cyl('Beam_End_'+str(x)+'_'+str(z),(x,y,z),.072,.035,brass,'X',12)
 # Actual individually modelled warp threads; dark gaps survive icon scale.
 warp_count=int(RECIPE.get('warp_threads',31));xs=[-.36+i*(.72/max(1,warp_count-1)) for i in range(warp_count)]
 path=[(.285,1.185),(.045,1.00),(-.31,.895),(-.36,.79),(-.305,.66)]
 strip_mesh('Warp_Thread_',xs,path,.0065,yarn)
 # Hanging moss-green woven cloth with a thick rolled end, long flat broad shapes.
 strip_mesh('Woven_Cloth', [0], [(-.325,.865),(-.378,.755),(-.342,.57),(-.28,.51)], .72,cloth)
 cyl('Woven_Cloth_Roll',(0,-.28,.57),.095,.73,cloth,'X',16)
 # Suspended heddle frame and beater separated, useful future animation pivots.
 hp=empty('Heddle_Lift_Pivot',(0,.06,.98),root);hp['motion_axis_local']='Z'
 for x in [-.405,.405]:cube('Heddle_Side_'+str(x),(x,.04,1.008),(.042,.048,.22),wood,.005)
 for z in [.918,1.11]:cube('Heddle_Rail_'+str(z),(0,.04,z),(.84,.045,.038),wood,.005)
 for o in parts:
  if o.name.startswith('Heddle_'):mw=o.matrix_world.copy();o.parent=hp;o.matrix_world=mw
 # Reed is 13 chunky slats instead of dense high-cost yarn detail.
 bp=empty('Beater_Swing_Pivot',(0,-.095,1.275),root);bp['rotation_axis_local']='X'
 for x in [-.405,.405]:beam('Beater_Upright_'+str(x),(x,-.155,.85),(x,-.095,1.25),.042,.045,wood,.005)
 for z,y in [(.864,-.154),(1.065,-.122)]:cube('Beater_Rail_'+str(z),(0,y,z),(.855,.055,.043),wood,.005)
 reed_count=int(RECIPE.get('reed_slats',13))
 for i in range(reed_count):beam('Reed_Slat_'+str(i),(-.36+i*(.72/max(1,reed_count-1)),-.149,.884),(-.36+i*(.72/max(1,reed_count-1)),-.127,1.045),.008,.012,yarn,0)
 for o in parts:
  if o.name.startswith(('Beater_','Reed_')):mw=o.matrix_world.copy();o.parent=bp;o.matrix_world=mw
 for x in [-.17,.17]:
  beam('Treadle_'+str(x),(x,-.44,.14),(x,.18,.22),.11,.045,wood,.008)
  beam('Treadle_Link_'+str(x),(x,.10,.22),(x,.075,.88),.012,.012,iron,0)
 # A readable boat shuttle on the chest rail. Original shape, no third party mesh.
 vs=[(-.22,-.393,.920),(.22,-.393,.920),(.14,-.447,.902),(-.14,-.447,.902),(-.14,-.347,.902),(.14,-.347,.902),(-.22,-.393,.89),(.22,-.393,.89)]
 fs=[(0,4,5,1,2,3),(6,7,5,4),(6,3,2,7),(0,3,6),(1,7,2),(0,6,4),(1,5,7)]
 me=bpy.data.meshes.new('Shuttle_Mesh');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('Boat_Shuttle',me);COL.objects.link(o);o.parent=root;o.data.materials.append(wooddark);parts.append(o)
 cyl('Shuttle_Bobbin',(0,-.394,.925),.023,.17,yarn,'X',10)
 empty('Action_Position',(0,-.92,0),root)['purpose']='suggested seated/standing operator position; interaction not implemented'
 empty('Cloth_Output',(0,-.37,.65),root)['purpose']='optional production/output VFX reference'

def heartbeat():
 while True:
  time.sleep(20)
  p=ROOT/'status.json'
  try:
   d=json.loads(p.read_text());d['heartbeat_at_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();q=ROOT/'status.heartbeat.tmp';q.write_text(json.dumps(d,indent=2));q.replace(p)
  except Exception:pass
threading.Thread(target=heartbeat,daemon=True).start()
status(ASSET+' '+REV+' geometry building','build_started')
if ASSET=='grindstone':make_grindstone()
elif ASSET=='loom':make_loom()
else:raise ValueError('Unknown asset')
finish_uv()
# Manifest and topology check are per separate functional component. Intentional joints overlap.
def audit():
 bpy.context.view_layer.update()
 meshes=[]; allv=[]
 for o in parts:
  me=o.data;me.calc_loop_triangles();bm=bmesh.new();bm.from_mesh(me);boundary=sum(e.is_boundary for e in bm.edges);nonmani=sum(not e.is_manifold for e in bm.edges);loose=sum(not e.link_faces for e in bm.edges);vol=bm.calc_volume(signed=True);bm.free()
  zero=sum(t.area<1e-10 for t in me.loop_triangles);uv=me.uv_layers.active;uvzero=0
  for p in me.polygons:
   pts=[uv.data[i].uv for i in p.loop_indices];a=abs(sum(pts[j].x*pts[(j+1)%len(pts)].y-pts[(j+1)%len(pts)].x*pts[j].y for j in range(len(pts)))/2);uvzero+=a<1e-10
  vs=[o.matrix_world@v.co for v in me.vertices];allv+=vs
  meshes.append({'name':o.name,'triangles':len(me.loop_triangles),'vertices':len(me.vertices),'materials':[m.name for m in me.materials],'uv_layer':uv.name if uv else None,'zero_area_triangles':zero,'zero_uv_faces':uvzero,'boundary_edges':boundary,'nonmanifold_edges':nonmani,'loose_edges':loose,'signed_volume_m3':vol,'parent':o.parent.name if o.parent else None,'finite_coordinates':all(math.isfinite(c) for v in vs for c in v),'unit_scale':list(o.scale)})
 lo=[min(v[i] for v in allv) for i in range(3)];hi=[max(v[i] for v in allv) for i in range(3)]
 return {'asset':ASSET,'revision':REV,'blender_version':bpy.app.version_string,'scope':'standalone Blender geometry/UV QA; current project rules and Unity shader/runtime unverified','units':'1 Blender unit = 1 metre','root_pivot_m':[0,0,0],'bounds_min_m':lo,'bounds_max_m':hi,'dimensions_m':[hi[i]-lo[i] for i in range(3)],'triangles':sum(m['triangles'] for m in meshes),'mesh_count':len(meshes),'material_count_used':len(set(m for x in meshes for m in x['materials'])),'components':meshes,'passed':all(x['finite_coordinates'] and x['zero_area_triangles']==0 and x['zero_uv_faces']==0 and x['nonmanifold_edges']==0 and x['signed_volume_m3']>0 for x in meshes),'intentional_component_overlap':'joined structural beams, axles, cloth roll and yarn contacts. Not a boolean-union or physics acceptance claim.'}
qa=audit();(OUT/'mesh_qa.json').write_text(json.dumps(qa,indent=2))
if not qa['passed']:raise RuntimeError('Mesh QA failed; inspect mesh_qa.json')
# Batch editable components into only a static frame and useful moving assemblies.
# Originals stay in a hidden source collection; exports select only ASSET/runtime.
if REV=='final':
 SOURCE=bpy.data.collections.new('SOURCE_PARTS_EDITABLE');S.collection.children.link(SOURCE);SOURCE.hide_render=True;SOURCE.hide_viewport=True
 groups={}
 for o in parts:groups.setdefault(o.parent,[]).append(o)
 runtime=[]
 for parent,objs in groups.items():
  verts=[];faces=[];uvs=[];slots=[];face_mats=[];inv=parent.matrix_world.inverted() if parent else None
  for o in objs:
   me=o.data;off=len(verts);mx=inv@o.matrix_world if inv else o.matrix_world
   verts.extend([tuple(mx@v.co) for v in me.vertices])
   for p in me.polygons:
    faces.append(tuple(off+i for i in p.vertices));m=me.materials[p.material_index]
    if m not in slots:slots.append(m)
    face_mats.append(slots.index(m));uvs.extend([tuple(me.uv_layers.active.data[i].uv) for i in p.loop_indices])
   COL.objects.unlink(o);SOURCE.objects.link(o)
  name=ASSET.title()+('_StaticFrame' if parent==root else '_'+parent.name.replace('_Pivot',''))
  me=bpy.data.meshes.new(name+'_Mesh');me.from_pydata(verts,[],faces);me.update();uv=me.uv_layers.new(name='UVMap')
  for i,val in enumerate(uvs):uv.data[i].uv=val
  for m in slots:me.materials.append(m)
  for i,p in enumerate(me.polygons):p.material_index=face_mats[i];p.use_smooth=False
  o=bpy.data.objects.new(name,me);COL.objects.link(o);o.parent=parent;runtime.append(o)
 parts=runtime
 runtime_qa=audit();runtime_qa['editable_source_components']=len(qa['components']);runtime_qa['component_qa_file']='mesh_qa.json';(OUT/'runtime_mesh_qa.json').write_text(json.dumps(runtime_qa,indent=2))
 # Joined runtime intentionally contains disjoint closed volumes and joint overlaps.
 # Source-level QA is the meaningful manifold test; runtime UV/finite/triangle checks must remain clean.
 assert runtime_qa['triangles']==qa['triangles']
 assert all(x['finite_coordinates'] and x['zero_area_triangles']==0 and x['zero_uv_faces']==0 for x in runtime_qa['components'])
 qa['runtime_mesh_count']=len(parts);qa['runtime_meshes']=[o.name for o in parts]
# Asset export selection excludes studio. FBX preserves meaningful component pivots and names.
bpy.ops.object.select_all(action='DESELECT')
for o in COL.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.fbx(filepath=str(OUT/(ASSET+'.fbx')),use_selection=True,object_types={'MESH','EMPTY'},axis_forward='-Z',axis_up='Y',apply_unit_scale=True,global_scale=1,bake_space_transform=False,add_leaf_bones=False,path_mode='COPY',embed_textures=True,mesh_smooth_type='FACE',use_mesh_modifiers=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/(ASSET+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True)
# Studio is separated and never exported. Warm soft three-point shading exposes flat facet design.
for nm,loc,power,size in [('Key',(-3,-4,5),550,4),('Fill',(3,-1,3),260,3),('Rim',(1,3,4),430,3)]:
 l=bpy.data.lights.new(nm,'AREA');l.energy=power;l.shape='DISK';l.size=size;o=bpy.data.objects.new(nm,l);STUDIO.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.65))-o.location).to_track_quat('-Z','Y').to_euler()
plane=cube('Studio_Floor',(0,0,-.025),(200,200,.05),mat('Studio_Ground',(.30,.345,.33)),0,parent=None);parts.remove(plane);COL.objects.unlink(plane);STUDIO.objects.link(plane)
camd=bpy.data.cameras.new('Review_Camera');cam=bpy.data.objects.new('Review_Camera',camd);STUDIO.objects.link(cam);S.camera=cam;camd.type='ORTHO';camd.lens=48
center=Vector((0,0,qa['bounds_max_m'][2]*.50));extent=max(qa['dimensions_m']);camd.ortho_scale=extent*1.65
views={'hero':(2.8,-4,2.5),'rear':(-2.8,3.8,2.2),'front':(0,-4,1.2),'side':(4,0,1.2)}
status(ASSET+' '+REV+' exported; rendering review views','exports_written')
for key,loc in views.items():
 if REV=='sample' and key!='hero':continue
 cam.location=Vector(loc)*(.80 if ASSET=='grindstone' else 1);cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();S.render.resolution_x=512;S.render.resolution_y=512;S.render.resolution_percentage=100;S.render.filepath=str(OUT/(key+'_512.png'));bpy.ops.render.render(write_still=True);status(ASSET+' '+REV+' rendered '+key)
 if key=='hero' and REV=='final':
  S.render.resolution_x=1024;S.render.resolution_y=1024;S.render.filepath=str(OUT/'hero_1024.png');bpy.ops.render.render(write_still=True);status(ASSET+' final hero 1024 rendered')
# Keep hero in saved .blend with tidy separated render collection.
cam.location=Vector(views['hero'])*(.80 if ASSET=='grindstone' else 1);cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();S.render.resolution_x=S.render.resolution_y=1024;S.render.filepath='//hero_1024.png'
for im in bpy.data.images:
 if im.source=='FILE' and im.packed_file:im.filepath='//../../textures/'+Path(im.filepath).name
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(ASSET+'.blend')))
used=sorted(set(m for x in qa['components'] for m in x['materials'])); manifest={'asset':ASSET,'revision':REV,'triangles':qa['triangles'],'dimensions_m':qa['dimensions_m'],'materials':used,'root_pivot':[0,0,0],'qa_passed':qa['passed'],'runtime_mesh_count':len(parts),'runtime_meshes':[o.name for o in parts],'files':[]}
for p in sorted(OUT.iterdir()):
 if p.is_file() and not p.name.endswith('.blend1'):manifest['files'].append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2));status(ASSET+' '+REV+' ready for visual inspection','asset_candidate_ready',[str(OUT.relative_to(ROOT))])
print('ASSET_RESULT',json.dumps({'asset':ASSET,'revision':REV,'triangles':qa['triangles'],'qa_passed':qa['passed'],'output':str(OUT)}))
