"""Deterministic Blender 4.3.2 builder. Run: blender -b -t 2 --python scripts/build_assets.py -- --asset barrel --mode sample
Modes sample / final. Output paths are relative to this script's parent directory.
"""
import bpy, bmesh, math, sys, json, pathlib, datetime, hashlib, os, argparse
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
P=json.loads((ROOT/'recipes/assets.json').read_text())
a=argparse.ArgumentParser();a.add_argument('--asset',choices=['barrel','composter'],default='barrel');a.add_argument('--mode',choices=['sample','final'],default='sample');a.add_argument('--lod',action='store_true');args=a.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])

def stamp(stage,outputs=None):
 p=ROOT/'status.json';s=json.loads(p.read_text()) if p.exists() else {};n=datetime.datetime.now(datetime.timezone.utc).isoformat();s.update(heartbeat_at_utc=n,updated_at_utc=n,stage=stage,stage_zh={'build':'构建资产','render':'生成预览','export':'导出资产','asset':'离线资产就绪'}.get(stage.split('_')[0],stage),state='review' if stage.startswith('asset_complete') else 'running')
 if outputs:s.setdefault('asset_outputs',[]).extend(outputs)
 tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(s,indent=2));tmp.replace(p)
 with open(ROOT/'events.jsonl','a') as f:f.write(json.dumps({'at_utc':n,'event':stage,'asset':args.asset})+'\n')

mem=int(next(x for x in open('/proc/meminfo') if x.startswith('MemAvailable:')).split()[1])*1024
free=os.statvfs(ROOT).f_bavail*os.statvfs(ROOT).f_frsize
if mem<2*1024**3 or free<3*1024**3:raise RuntimeError('Resource guard requires >=2 GiB available RAM and >=3 GiB free disk; retry later')
bpy.ops.wm.read_factory_settings(use_empty=True)
S=bpy.context.scene;S.unit_settings.system='METRIC';S.unit_settings.scale_length=1.0;S.render.threads_mode='FIXED';S.render.threads=2
S.render.engine='CYCLES';S.cycles.samples=48;S.cycles.use_denoising=False;S.cycles.device='CPU'
S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast'
S.render.image_settings.file_format='PNG';S.render.film_transparent=False
S.world=bpy.data.worlds.new('World_Studio');S.world.use_nodes=True;S.world.node_tree.nodes['Background'].inputs[0].default_value=(0.25,0.30,0.33,1);S.world.node_tree.nodes['Background'].inputs[1].default_value=.65
asset_col=bpy.data.collections.new('Asset_Source');S.collection.children.link(asset_col)
studio=bpy.data.collections.new('Preview_Studio_NotExported');S.collection.children.link(studio)

def srgb(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4

def mat(name,tex=None,rgb=None,rough=.85,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Specular IOR Level'].default_value=.25
 if tex:
  t=n.new('ShaderNodeTexImage');t.name='Shared_Source_Albedo';t.image=bpy.data.images.load(str(ROOT/tex));t.image.pack();t.interpolation='Linear';m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 else:p.inputs['Base Color'].default_value=(*[srgb(x) for x in rgb],1)
 m.diffuse_color=p.inputs['Base Color'].default_value
 m['runtime_shader_note']='Portable Principled PBR interchange; apply project cel shader on import. Preview is stylized studio lighting, not Unity shader validation.'
 return m
wood=mat('M_Shared_WarmWood','textures/T_Wood_Warm_BaseColor.png');iron=mat('M_Shared_MatteIron',rgb=P['shared_materials']['M_Shared_MatteIron']['basecolor_srgb'],rough=.78,metal=.15);organic=mat('M_CompostOrganic',rgb=[.22,.145,.07],rough=1);leaf=mat('M_CompostLeaf',rgb=[.33,.41,.16],rough=1)
objects=[]

def move(obj,col):
 for c in list(obj.users_collection):c.objects.unlink(obj)
 col.objects.link(obj)

def mesh(name,v,f,material=wood,uv=None,bevel=0):
 me=bpy.data.meshes.new(name+'_Mesh');me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);asset_col.objects.link(o);o.data.materials.append(material)
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
 if uv:
  layer=me.uv_layers.new(name='UV0')
  for poly in me.polygons:
   for i in poly.loop_indices:layer.data[i].uv=uv(me.vertices[me.loops[i].vertex_index].co,poly.normal)
 else:
  layer=me.uv_layers.new(name='UV0')
  for poly in me.polygons:
   for i in poly.loop_indices:
    co=me.vertices[me.loops[i].vertex_index].co;n=poly.normal
    layer.data[i].uv=((co.x+.5,co.z) if abs(n.y)>.5 else (co.y+.5,co.z) if abs(n.x)>.5 else (co.x+.5,co.y+.5))
 if bevel:
  bpy.context.view_layer.objects.active=o;o.select_set(True);mod=o.modifiers.new('Structural_Edge_Chamfer','BEVEL');mod.width=bevel;mod.segments=1;mod.affect='EDGES';bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
  mod=o.modifiers.new('Broad_Face_Normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=50
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 g=o.vertex_groups.new(name=name);g.add(list(range(len(me.vertices))),1,'REPLACE');objects.append(o);return o

def box(name,center,dims,material=wood,bevel=.004):
 x,y,z=center;dx,dy,dz=[d/2 for d in dims];v=[(x+sx*dx,y+sy*dy,z+sz*dz) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]];f=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)];return mesh(name,v,f,material,bevel=bevel)

def circleclip(poly,axis,limit,positive):
 out=[]
 for i,q in enumerate(poly):
  p=poly[i-1];ip=(p[axis]>=limit) if positive else (p[axis]<=limit);iq=(q[axis]>=limit) if positive else (q[axis]<=limit)
  if ip!=iq:
   t=(limit-p[axis])/(q[axis]-p[axis]);out.append((p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])))
  if iq:out.append(q)
 return out

def barrel():
 p=P['barrel'];N=p['staves'];levels=[(0,p['radius_bottom']),(.08,p['radius_bottom']+.016),(.24,.438),(.51,p['radius_mid']),(.80,.439),(1.00,p['radius_top']+.007),(p['height'],p['radius_top'])]
 for j in range(N):
  t0=2*math.pi*j/N+p['seam_radians']/2;t1=2*math.pi*(j+1)/N-p['seam_radians']/2;v=[]
  for z,r in levels:
   for rad,t in [(r,t0),(r,t1),(r-p['wall_thickness'],t0),(r-p['wall_thickness'],t1)]:v.append((rad*math.cos(t),rad*math.sin(t),z))
  f=[]
  for k in range(len(levels)-1):
   b=4*k;f.extend([(b,b+1,b+5,b+4),(b+2,b+6,b+7,b+3),(b,b+4,b+6,b+2),(b+1,b+3,b+7,b+5)])
  f.extend([(0,2,3,1),(len(v)-4,len(v)-3,len(v)-1,len(v)-2)])
  mid=(t0+t1)/2;uoff=(j*0.173)%0.73
  def uv(co,n):
   angle=math.atan2(co.y,co.x)
   if angle<t0-math.pi:angle+=2*math.pi
   if angle>t1+math.pi:angle-=2*math.pi
   return (uoff+(angle-t0)/(t1-t0)*.17,.015+co.z*.88)
  mesh('Stave_%02d'%j,v,f,wood,uv,bevel=0 if args.lod else .003)
 def radius(z):
  for (z0,r0),(z1,r1) in zip(levels,levels[1:]):
   if z0<=z<=z1:return r0+(r1-r0)*(z-z0)/(z1-z0)
  return levels[-1][1]
 for h,z in enumerate(p['hoop_positions']):
  ht=p['hoop_height'];zs=[z-ht/2,z-ht/2+.005,z+ht/2-.005,z+ht/2];v=[]
  for k,zz in enumerate(zs):
   r=radius(zz)+(.009 if k in [0,3] else .013)
   for j in range(N):t=2*math.pi*j/N;v.append((r*math.cos(t),r*math.sin(t),zz))
  for zz in [zs[0],zs[-1]]:
   r=radius(zz)+.002
   for j in range(N):t=2*math.pi*j/N;v.append((r*math.cos(t),r*math.sin(t),zz))
  f=[]
  for k in range(3):
   for j in range(N):jn=(j+1)%N;f.append((k*N+j,k*N+jn,(k+1)*N+jn,(k+1)*N+j))
  for j in range(N):jn=(j+1)%N;f.extend([(j,4*N+j,4*N+jn,jn),(3*N+j,3*N+jn,5*N+jn,5*N+j),(4*N+j,5*N+j,5*N+jn,4*N+jn)])
  mesh('Iron_Hoop_%02d'%h,v,f,iron)
  # restrained 6-sided rivets, two front-facing and two rear-facing
  for j in ([] if args.lod else [1,5,9,13]):
   t=2*math.pi*j/N;rr=radius(z)+.015;cen=Vector((rr*math.cos(t),rr*math.sin(t),z));normal=Vector((math.cos(t),math.sin(t),0));u=Vector((-math.sin(t),math.cos(t),0));vv=Vector((0,0,1));vs=[]
   for depth,rad in [(0,.012),(.003,.009)]:
    for k in range(6):q=cen+normal*depth+(u*math.cos(k*math.tau/6)+vv*math.sin(k*math.tau/6))*rad;vs.append(tuple(q))
   fs=[tuple(range(6,12)),tuple(reversed(range(6)))]+[(k,(k+1)%6,(k+1)%6+6,k+6) for k in range(6)];mesh('Hoop_%d_Rivet_%d'%(h,j),vs,fs,iron)
 # slightly recessed lid, plank outlines follow same 16-gon silhouette
 rad=p['radius_top']-p['wall_thickness']-.006;circle_n=16 if args.lod else 32;circ=[(rad*math.cos(k*math.tau/circle_n),rad*math.sin(k*math.tau/circle_n)) for k in range(circle_n)];n=p['lid_planks'];step=2*rad/n
 for j in range(n):
  low=-rad+j*step+.002;high=-rad+(j+1)*step-.002;poly=circleclip(circleclip(circ,1,low,True),1,high,False);L=len(poly);v=[(x,y,z) for z in [p['lid_height']-.022,p['lid_height']] for x,y in poly];f=[tuple(reversed(range(L))),tuple(range(L,2*L))]+[(i,(i+1)%L,(i+1)%L+L,i+L) for i in range(L)]
  def uv(co,n):return (.10+(co.y+rad)*.5,.08+(co.x+rad))
  mesh('Lid_Plank_%02d'%j,v,f,wood,uv,bevel=0 if args.lod else .0025)
 # bottom closure, hidden but fully authored
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=p['radius_bottom']-.019,depth=.035,location=(0,0,.018));o=bpy.context.object;o.name='Bottom_Closure';move(o,asset_col);o.data.materials.append(wood);g=o.vertex_groups.new(name=o.name);g.add(list(range(len(o.data.vertices))),1,'REPLACE');objects.append(o)
 return objects

def composter():
 p=P['composter'];foot=p['footprint'];post=p['post_width'];half=foot/2-post/2
 for x in [-half,half]:
  for y in [-half,half]:box('Corner_Post_%s_%s'%(x,y),(x,y,p['height']/2),(post,post,p['height']),bevel=.005)
 # taper the wall subtly from lower width 0.84 to upper width .94 for an identifiable bin silhouette
 for k in range(p['slat_tiers']):
  z=.11+k*(p['slat_height']+p['slat_gap']);width=.865+k*.015;dep=width;th=p['board_thickness'];span=width-.03
  for side in [-1,1]:
   box('Side_X_%d_%d'%(side,k),(side*(width/2-th/2),0,z),(th,span,p['slat_height']),bevel=p['bevel_width'])
   box('Side_Y_%d_%d'%(side,k),(0,side*(dep/2-th/2),z),(span-.045,th,p['slat_height']),bevel=p['bevel_width'])
 # four clean rim beams with corner joints, no duplicate crossed cap geometry
 w=foot+.026;rw=p['rim_width'];z=p['height']-.027
 for side in [-1,1]:
  box('Top_Rim_X_%d'%side,(side*(w/2-rw/2),0,z),(rw,w-.002,.054),bevel=.005)
  box('Top_Rim_Y_%d'%side,(0,side*(w/2-rw/2),z),(w-2*rw-.004,rw,.054),bevel=.005)
 # internal floor boards, bottom center .040m
 for k in range(4):box('Floor_Plank_%d'%k,(-.3+k*.2,0,.04),(.192,.78,.052),bevel=.003)
 # real 3D lowpoly compost mound, optional single mesh to represent fill state
 v=[(-.37,-.37,.11),(.37,-.37,.11),(.37,.37,.11),(-.37,.37,.11)]
 top=[(-.37,-.37,.585),(0,-.37,.61),(.37,-.37,.575),(.37,0,.62),(.37,.37,.59),(0,.37,.635),(-.37,.37,.60),(-.37,0,.635),(0,0,.66)]
 v+=top;f=[(0,3,2,1),(0,1,6,5,4),(1,2,8,7,6),(2,3,10,9,8),(3,0,4,11,10)];f.extend([(12,4+i,4+(i+1)%8) for i in range(8)]);mesh('Fill_Compost_Mound',v,f,organic)
 # compost fragments stay below the open rim, low saturation and truly removable fill semantics
 for i,(x,y,z,rot) in enumerate([(-.18,-.12,.643,.35),(.18,.08,.645,-.4),(-.06,.22,.659,.7)]):
  c=math.cos(rot);s=math.sin(rot);base=[(-.07,0,0),(0,-.042,0),(.08,0,.008),(0,.043,0),(0,0,.018)];vv=[(x+xx*c-yy*s,y+xx*s+yy*c,z+zz) for xx,yy,zz in base];ff=[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(3,2,1,0)];mesh('Fill_Leaf_%d'%i,vv,ff,leaf)
 return objects

stamp('build_'+args.asset)
barrel() if args.asset=='barrel' else composter()
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();asset=bpy.context.object;asset.name=P[args.asset]['id']+('_LOD1' if args.lod else '');asset.data.name=asset.name+'_Mesh';S.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
# consolidation drops duplicate same-identity slots, keeps named shared library slots
materials=[]
for m in asset.data.materials:
 if m not in materials:materials.append(m)
old=list(asset.data.materials);mapping={i:materials.index(m) for i,m in enumerate(old)}
face_material_indices=[mapping[poly.material_index] for poly in asset.data.polygons]
asset.data.materials.clear()
for m in materials:asset.data.materials.append(m)
for poly,idx in zip(asset.data.polygons,face_material_indices):poly.material_index=idx
# join changes UV layer names only if missing; guarantee all loops
assert len(asset.data.uv_layers)>0
for layer in list(asset.data.uv_layers):
 if layer.name!='UV0':asset.data.uv_layers.remove(layer)
asset.data.uv_layers.active=asset.data.uv_layers['UV0']
asset['unit']='metres';asset['pivot']='base_center';asset['style_scope']='Historical preview aligned; current Unity/project standard not verified';asset['source_editability']='Named component vertex groups; no species/colour duplicate geometry'
asset.data.calc_loop_triangles();coords=[asset.matrix_world@Vector(c) for c in asset.bound_box];bounds={'min':[min(v[i] for v in coords) for i in range(3)],'max':[max(v[i] for v in coords) for i in range(3)]}
# studio floor and 3 soft lights
floor=mat('Preview_Floor_NotRuntime',rgb=[.65,.72,.73],rough=1)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003));o=bpy.context.object;o.name='Preview_Ground';move(o,studio);o.data.materials.append(floor)
def light(name,loc,energy,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.5))-o.location).to_track_quat('-Z','Y').to_euler()
light('Key_Area',(-3,-4,6),450,4);light('Fill_Area',(4,-1,3),180,3);light('Rim_Area',(1,4,5),300,3)
camd=bpy.data.cameras.new('Preview_Camera');cam=bpy.data.objects.new('Preview_Camera',camd);studio.objects.link(cam);S.camera=cam;camd.type='ORTHO';camd.ortho_scale=1.58 if args.asset=='barrel' else 1.72

def camera(angle,elevation=1.65):
 r=3.4;cam.location=(r*math.cos(angle),r*math.sin(angle),elevation);cam.rotation_euler=(Vector((0,0,.51))-cam.location).to_track_quat('-Z','Y').to_euler()
def render(path,res=512,angle=-math.pi/3):
 camera(angle);S.render.resolution_x=res;S.render.resolution_y=res;S.render.resolution_percentage=100;S.render.filepath=str(path);stamp('render_'+path.name);bpy.ops.render.render(write_still=True)
if args.mode=='sample':
 render(ROOT/'previews'/('barrel_sample_v%02d.png'%P['barrel']['review_iteration']),768)
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source'/(asset.name+'_sample.blend')))
else:
 stamp('export_'+args.asset)
 camera(-math.pi/3)
 bpy.ops.object.select_all(action='DESELECT');asset.select_set(True);bpy.context.view_layer.objects.active=asset
 # portable external texture path and packed editable source
 for im in bpy.data.images:
  if im.source=='FILE':im.pack()
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source'/(asset.name+'.blend')))
 bpy.ops.export_scene.fbx(filepath=str(ROOT/'exports'/(asset.name+'.fbx')),use_selection=True,object_types={'MESH'},apply_unit_scale=True,global_scale=1.0,axis_forward='-Z',axis_up='Y',use_mesh_modifiers=True,mesh_smooth_type='FACE',path_mode='COPY',embed_textures=True,add_leaf_bones=False,bake_anim=False)
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'exports'/(asset.name+'.glb')),export_format='GLB',use_selection=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_yup=True,export_animations=False)
 for i in range(0 if args.lod else 4):render(ROOT/'previews'/(args.asset+'_turn_%02d_512.png'%i),512,-math.pi/3+i*math.pi/2)
 render(ROOT/'previews'/(args.asset+('_lod1_hero_512.png' if args.lod else '_hero_1024.png')),512 if args.lod else 1024)
 # Blender-side native QA, not Unity test
 bm=bmesh.new();bm.from_mesh(asset.data)
 deg=sum(1 for p in bm.faces if p.calc_area()<1e-10);boundary=sum(1 for e in bm.edges if e.is_boundary);nonmanifold=sum(1 for e in bm.edges if not e.is_manifold)
 layer=asset.data.uv_layers.active;uvs=[tuple(x.uv) for x in layer.data]
 report={'id':asset.name,'lod_level':1 if args.lod else 0,'blender_version':bpy.app.version_string,'triangles':len(asset.data.loop_triangles),'vertices':len(asset.data.vertices),'polygons':len(asset.data.polygons),'material_slots':[m.name for m in asset.data.materials],'component_vertex_groups':[g.name for g in asset.vertex_groups],'dimensions_m':list(asset.dimensions),'bounds_m':bounds,'pivot_world_m':list(asset.location),'scale':list(asset.scale),'rotation_euler':list(asset.rotation_euler),'uv':{'layers':[l.name for l in asset.data.uv_layers],'loop_count':len(uvs),'finite':all(math.isfinite(v) for uv in uvs for v in uv),'range_min':[min(u[i] for u in uvs) for i in range(2)],'range_max':[max(u[i] for u in uvs) for i in range(2)],'layout':'Overlapping/reused directional wood islands by design; UV0 only, not a unique lightmap unwrap'},'mesh_qa':{'zero_area_faces':deg,'boundary_edges':boundary,'nonmanifold_edges':nonmanifold,'disconnected_parts':'Intentional closed stave/board/rivet components; no boolean union required'},'export_scope':'Offline Blender FBX/GLB; actual Unity import/runtime/shader/phone performance not tested','import_recommendation':{'scale_factor':1.0,'unity_shader':'Assign approved project cel shader to meaningful named slots','collider':'Barrel: capsule or 16-sided convex hull; composter: 4 box walls plus floor, no collision on compost leaf details'},'preview_shader':'Principled shared source material under stylized high-contrast lighting; no claim of baked/native cel shader'}
 bm.free();(ROOT/'reports'/(args.asset+('_lod1' if args.lod else '')+'_manifest.json')).write_text(json.dumps(report,indent=2))
 stamp('asset_complete_'+args.asset,[{'id':asset.name,'source':'source/'+asset.name+'.blend','fbx':'exports/'+asset.name+'.fbx','glb':'exports/'+asset.name+'.glb','preview':'previews/'+args.asset+('_lod1_hero_512.png' if args.lod else '_hero_1024.png'),'triangles':report['triangles']}])
print('DONE',args.asset,args.mode)
