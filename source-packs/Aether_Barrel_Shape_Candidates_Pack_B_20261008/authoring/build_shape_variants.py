"""Build four original barrel form candidates, reusing existing material artwork.
Blender 4.3.2, -b -t 2 --python this_file. No first-stage files are overwritten.
"""
import bpy,bmesh,json,pathlib,math,hashlib,datetime,os,time,shutil,sys
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT.parents[1];cfg=json.loads((ROOT/'recipes/shape-variants.json').read_text());ids=['genshin','ghibli','bk','oil'];art=json.loads((BASE/'styles/style-recipes.json').read_text());texnames={x['id']:x['texture'] for x in art['styles']}
def status(stage,zh,output=None):
 p=BASE/'status.json';d=json.loads(p.read_text());now=datetime.datetime.now(datetime.timezone.utc).isoformat();d.update(state='running',stage=stage,stage_zh=zh,updated_at_utc=now,heartbeat_at_utc=now)
 if output:d.setdefault('shape_outputs',[]).append(output)
 p.with_suffix('.tmp').write_text(json.dumps(d,indent=2,ensure_ascii=False));p.with_suffix('.tmp').replace(p)
 with open(BASE/'events.jsonl','a') as f:f.write(json.dumps({'at_utc':now,'event':stage,'detail':zh,'output':output},ensure_ascii=False)+'\n')
def guard():
 while True:
  mem=int(next(x for x in open('/proc/meminfo') if x.startswith('MemAvailable:')).split()[1])*1024;stat=os.statvfs(ROOT)
  if mem>=2*1024**3 and stat.f_bavail*stat.f_frsize>=3*1024**3:return
  status('shape_resource_wait','形体构建等待安全内存/磁盘余量');time.sleep(30)
guard();bpy.ops.wm.open_mainfile(filepath=str(BASE/'styles/source/barrel_six_styles_library.blend'));S=bpy.context.scene;S.render.threads_mode='FIXED';S.render.threads=2;S.render.resolution_x=512;S.render.resolution_y=512;S.cycles.samples=48;S.cycles.use_denoising=False
# Preserve original camera, studio and world. Remove only the old asset, not lights/floor.
bpy.data.objects.remove(bpy.data.objects['aether_wooden_barrel_v01'],do_unlink=True)
asset_col=bpy.data.collections.new('Second_Stage_Shape_Candidates');S.collection.children.link(asset_col);objects=[];wood=bpy.data.materials['M_Style_genshin_Wood']
exec((ROOT/'scripts/geometry_utils.py').read_text(),globals())
(ROOT/'textures').mkdir(exist_ok=True)
for id in ids:
 im=bpy.data.images['T_Style_'+id+'_Wood_Albedo'];dest=ROOT/'textures'/texnames[id];dest.write_bytes(bytes(im.packed_file.data));im.filepath=str(dest);im.unpack(method='REMOVE')

def shape(p):
 global objects,wood
 objects=[];wood=bpy.data.materials['M_Style_'+p['id']+'_Wood'];iron=bpy.data.materials['M_Style_'+p['id']+'_Iron'];N=p['staves'];levels=p['profile'];H=levels[-1][0];angles=[0]
 widths=[1+.09*math.sin(j*1.91)+.04*math.cos(j*.73) if p.get('handmade') else 1 for j in range(N)];norm=math.tau/sum(widths)
 for w in widths:angles.append(angles[-1]+w*norm)
 def rmod(t):return .012*math.sin(2*t+.5)+.006*math.cos(3*t+.8) if p.get('handmade') else 0
 def zmod(t,z):return ((.012*math.sin(3*t)+.008*math.cos(5*t))*max(0,(z-.8)/(H-.8))) if p.get('handmade') else 0
 def radius(z,t):
  for (z0,r0),(z1,r1) in zip(levels,levels[1:]):
   if z0<=z<=z1:return r0+(r1-r0)*(z-z0)/(z1-z0)+rmod(t)
  return (levels[0][1] if z<0 else levels[-1][1])+rmod(t)
 for j in range(N):
  t0=angles[j]+p['seam']/2;t1=angles[j+1]-p['seam']/2;v=[]
  for z,r in levels:
   for inner,t in [(False,t0),(False,t1),(True,t0),(True,t1)]:
    rr=r+rmod(t)-(p['wall'] if inner else 0);v.append((rr*math.cos(t),rr*math.sin(t),z+zmod(t,z)))
  f=[]
  for k in range(len(levels)-1):
   b=k*4;f.extend([(b,b+1,b+5,b+4),(b+2,b+6,b+7,b+3),(b,b+4,b+6,b+2),(b+1,b+3,b+7,b+5)])
  f.extend([(0,2,3,1),(len(v)-4,len(v)-3,len(v)-1,len(v)-2)]);uoff=(j*.173)%0.73
  def uv(co,n):
   t=math.atan2(co.y,co.x)
   if t<t0-math.pi:t+=math.tau
   if t>t1+math.pi:t-=math.tau
   return (uoff+(t-t0)/(t1-t0)*.17,.015+co.z/H*.933)
  mesh('Stave_%02d'%j,v,f,wood,uv,bevel=p['bevel'])
 # closed fitted metal hoops: four radius levels, top/bottom inner edge and outer band bevel
 for h,(z,height) in enumerate(p['bands']):
  zs=[z-height/2,z-height/2+.004,z+height/2-.004,z+height/2];v=[]
  for k,zz in enumerate(zs):
   for j in range(N):
    t=angles[j];zo=zz+(.005*math.sin(2*t) if p.get('handmade') else 0);r=radius(zz,t)+(.009 if k in [0,3] else .013);v.append((r*math.cos(t),r*math.sin(t),zo))
  for zz in [zs[0],zs[-1]]:
   for j in range(N):t=angles[j];r=radius(zz,t)+.002;v.append((r*math.cos(t),r*math.sin(t),zz+(.005*math.sin(2*t) if p.get('handmade') else 0)))
  f=[]
  for k in range(3):
   for j in range(N):jn=(j+1)%N;f.append((k*N+j,k*N+jn,(k+1)*N+jn,(k+1)*N+j))
  for j in range(N):jn=(j+1)%N;f.extend([(j,4*N+j,4*N+jn,jn),(3*N+j,3*N+jn,5*N+jn,5*N+j),(4*N+j,5*N+j,5*N+jn,4*N+jn)])
  mesh('Iron_Hoop_%d'%h,v,f,iron)
  if p.get('square_rivets'):
   for jj in [1,4,6,9]:
    t=(angles[jj]+angles[jj+1])/2;normal=Vector((math.cos(t),math.sin(t),0));u=Vector((-math.sin(t),math.cos(t),0));vv=Vector((0,0,1));cen=normal*(radius(z,t)+.019)+vv*z;vs=[]
    for d in [0,.009]:
     for a,b in [(-1,-1),(1,-1),(1,1),(-1,1)]:vs.append(tuple(cen+normal*d+u*a*.018+vv*b*.018))
    mesh('Square_Rivet_%d_%d'%(h,jj),vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],iron)
 if p.get('rim'):
  outer=levels[-1][1]+.012;inner=levels[-1][1]-p['wall']-.008;v=[]
  for z,r in [(H-.045,outer),(H+.011,outer),(H+.011,inner),(H-.045,inner)]:
   for j in range(N):t=angles[j];v.append((r*math.cos(t),r*math.sin(t),z))
  f=[]
  for k in range(4):
   for j in range(N):f.append((k*N+j,k*N+(j+1)%N,((k+1)%4)*N+(j+1)%N,((k+1)%4)*N+j))
  mesh('Generous_Wooden_Rim',v,f,wood)
 rad=levels[-1][1]-p['wall']-.008;cn=p['lid_vertices'];circ=[(rad*math.cos(k*math.tau/cn),rad*math.sin(k*math.tau/cn)) for k in range(cn)];step=2*rad/p['lid_planks']
 for j in range(p['lid_planks']):
  poly=circleclip(circleclip(circ,1,-rad+j*step+.002,True),1,-rad+(j+1)*step-.002,False);L=len(poly);zz=p['lid_z']+(.004*math.cos(j*1.7) if p.get('handmade') else 0);v=[(x,y,z) for z in [zz-.024,zz] for x,y in poly];f=[tuple(reversed(range(L))),tuple(range(L,2*L))]+[(i,(i+1)%L,(i+1)%L+L,i+L) for i in range(L)]
  def uv(co,n):return (.10+(co.y+rad)*.5,.08+(co.x+rad))
  mesh('Lid_Plank_%d'%j,v,f,wood,uv,bevel=.002 if p['bevel'] else 0)
 bpy.ops.mesh.primitive_cylinder_add(vertices=N,radius=levels[0][1]-.015,depth=.034,location=(0,0,.017));b=bpy.context.object;b.name='Bottom_Closure';move(b,asset_col);b.data.materials.append(wood);g=b.vertex_groups.new(name=b.name);g.add(list(range(len(b.data.vertices))),1,'REPLACE');objects.append(b)
 bpy.ops.object.select_all(action='DESELECT')
 for x in objects:x.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name='aether_barrel_shape_'+p['id'];o.data.name=o.name+'_Mesh';S.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
 old=list(o.data.materials);mats=[]
 for m in old:
  if m not in mats:mats.append(m)
 inds=[mats.index(old[poly.material_index]) for poly in o.data.polygons];o.data.materials.clear()
 for m in mats:o.data.materials.append(m)
 for poly,i in zip(o.data.polygons,inds):poly.material_index=i
 for layer in list(o.data.uv_layers):
  if layer.name!='UV0':o.data.uv_layers.remove(layer)
 o.data.uv_layers.active=o.data.uv_layers['UV0'];o['unit']='metres';o['pivot']='base-center';o['form_language_candidate']=p['feature'];o['certification']='Original candidate, not exact source-game asset geometry'
 o.data.calc_loop_triangles();assert len(o.data.loop_triangles)<=3000,(p['id'],len(o.data.loop_triangles))
 return o

def portable(o,id):
 mats=[]
 for slot in o.data.materials:
  m=slot.copy();m.name='M_Export_'+id+('_Wood' if 'Wood' in slot.name else '_Iron');n=m.node_tree.nodes;l=m.node_tree.links;bsdf=n['Principled BSDF']
  if 'Wood' in slot.name:l.new(n['Shared_Source_Albedo'].outputs['Color'],bsdf.inputs['Base Color'])
  mats.append(m)
 return mats
reports=[];built=[]
for p in cfg['variants']:
 if p['id'] not in ids:continue
 guard();status('build_shape_'+p['id'],'构建不同桶体：'+p['label']);o=shape(p);built.append(o)
 for other in built:other.hide_render=(other!=o)
 S.render.filepath=str(ROOT/'previews'/('barrel_shape_'+p['id']+'_512.png'));status('render_shape_'+p['id'],'固定场景渲染不同形体：'+p['label']);bpy.ops.render.render(write_still=True)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;render_mats=list(o.data.materials);export_mats=portable(o,p['id'])
 for i,m in enumerate(export_mats):o.data.materials[i]=m
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/barrel_four_shape_candidates.blend'))
 bpy.ops.export_scene.fbx(filepath=str(ROOT/'exports'/(o.name+'.fbx')),use_selection=True,object_types={'MESH'},apply_unit_scale=True,global_scale=1,axis_forward='-Z',axis_up='Y',path_mode='RELATIVE',embed_textures=False,add_leaf_bones=False,bake_anim=False)
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'exports'/(o.name+'.glb')),export_format='GLB',use_selection=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_yup=True,export_animations=False)
 for i,m in enumerate(render_mats):o.data.materials[i]=m
 bm=bmesh.new();bm.from_mesh(o.data);zero=sum(x.calc_area()<1e-10 for x in bm.faces);nonmanifold=sum(not x.is_manifold for x in bm.edges);bm.free();coords=[o.matrix_world@v.co for v in o.data.vertices];sig=hashlib.sha256(json.dumps({'v':[[round(x,7) for x in v.co] for v in o.data.vertices],'f':[list(f.vertices) for f in o.data.polygons]},separators=(',',':')).encode()).hexdigest()
 rec={'id':p['id'],'label':p['label'],'object':o.name,'triangles':len(o.data.loop_triangles),'vertices':len(o.data.vertices),'geometry_sha256':sig,'dimensions_m':list(o.dimensions),'bounds_m':{'min':[min(x[i] for x in coords) for i in range(3)],'max':[max(x[i] for x in coords) for i in range(3)]},'pivot':list(o.location),'uv_layers':[x.name for x in o.data.uv_layers],'material_slots':[x.name for x in render_mats],'geometry_feature':p['feature'],'render':str(ROOT/'previews'/('barrel_shape_'+p['id']+'_512.png')),'fbx':str(ROOT/'exports'/(o.name+'.fbx')),'glb':str(ROOT/'exports'/(o.name+'.glb')),'texture':str(ROOT/'textures'/texnames[p['id']]),'texture_sha256':hashlib.sha256((ROOT/'textures'/texnames[p['id']]).read_bytes()).hexdigest(),'native_mesh_qa':{'zero_area_faces':zero,'nonmanifold_edges':nonmanifold},'export_material_boundary':'Export uses portable image->Principled materials with exact same artwork/roughness/iron values; NdotL art grouping in source Blender materials is not represented in FBX/glTF. No Unity shader acceptance claim.'};reports.append(rec);(ROOT/'reports/four_shapes_manifest.json').write_text(json.dumps({'scope':cfg['scope'],'state':'rendered_pending_roundtrip_and_independent_review','fixed_scene':{'camera_matrix':[list(r) for r in S.camera.matrix_world],'ortho_scale':S.camera.data.ortho_scale,'resolution':[512,512],'samples':48,'exposure':S.view_settings.exposure,'world_strength':S.world.node_tree.nodes['Background'].inputs[1].default_value},'records':reports},indent=2,ensure_ascii=False));status('shape_ready_'+p['id'],'形体候选已出：'+p['label'],rec)
# portable relative texture paths, only this new source file changes
for id in ids:bpy.data.images['T_Style_'+id+'_Wood_Albedo'].filepath='//../textures/'+texnames[id]
for m in list(bpy.data.materials):
 if m.name.startswith('M_Style_') and not any('_'+id+'_' in m.name for id in ids):bpy.data.materials.remove(m)
for x in built:x.hide_render=(x.name!='aether_barrel_shape_genshin')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/barrel_four_shape_candidates.blend'))
assert len(set(x['geometry_sha256'] for x in reports))==4
status('four_shapes_ready','四种桶体形体候选生成完毕，等待重导入/独立审阅');print('DONE FOUR SHAPES',[(x['id'],x['triangles']) for x in reports])
