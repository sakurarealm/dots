import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent;bpy.ops.wm.open_mainfile(filepath=str(D/'workshop-review.blend'));C=bpy.data.collections['WORKSHOP_SAMPLE'];bp=json.loads((D/'workshop-review-blueprint.json').read_text());rows={r['logicalPlacementKey']:r for r in bp['instances']};M={n:bpy.data.materials.get(n)for n in ['wood','plaster','stone','teal','forged-iron']}
def root(t,key,p=(0,0,0)):
 r=bpy.data.objects.new(key,None);C.objects.link(r);r.location=p;r['moduleTypeId']='workshop.'+t;r['logicalPlacementKey']=key;r['sourcePartId']='facade-r2:'+t;r['instanceId']='${buildingInstanceId}:'+hashlib.sha256(key.encode()).hexdigest()[:16];r['role']='registered_attachment';rows[key]=dict(logicalPlacementKey=key,moduleTypeId=r['moduleTypeId'],sourcePartId=r['sourcePartId'],instanceId=r['instanceId'],position=list(p),rotationZ=0,role='registered_attachment');return r
def box(r,n,p,s,mat,bev=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for c in list(o.users_collection):c.objects.unlink(o)
 C.objects.link(o);o.parent=r;o.data.materials.append(M[mat])
 if bev:
  mod=o.modifiers.new('authored_edge','BEVEL');mod.width=bev;mod.segments=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 uv=o.data.uv_layers.active
 if uv:
  for poly in o.data.polygons:
   axes=[i for i in range(3)if i!=max(range(3),key=lambda i:abs(poly.normal[i]))]
   for li in poly.loop_indices:
    v=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(v[axes[0]],v[axes[1]])
 return o
def bar(r,n,a,b,w=.25,d=.25):
 a=Vector(a);b=Vector(b);o=box(r,n,(a+b)/2,(w,d,(b-a).length),'wood',.018);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def remove(r):
 for o in list(r.children_recursive):bpy.data.objects.remove(o,do_unlink=True)
 rows.pop(r.get('logicalPlacementKey'),None);bpy.data.objects.remove(r,do_unlink=True)
# Replace only structural wood/stone wall material/type, preserve actual solid1cube geometry and stable logical slots.
shared={}
for r in [o for o in C.objects if o.type=='EMPTY']:
 if r.type!='EMPTY':continue
 key=r.get('logicalPlacementKey','')
 if key.startswith('cell.'):
  x,y,z=map(int,key.split('.')[1:])
  if x==17 and z>=0:remove(r);continue
  mat='plaster'if z>=0 else 'stone'if z==-1 and(x in[0,13,17]or y in[0,11])else None
  if mat:
   for o in r.children:
    if o.type!='MESH':continue
    k=(o.data.name,mat)
    if k not in shared:
     shared[k]=o.data.copy();shared[k].materials.clear();shared[k].materials.append(M[mat])
    o.data=shared[k]
   t='wall_1'if mat=='plaster'else'stone_1';r['moduleTypeId']='workshop.'+t;rows[key]['moduleTypeId']=r['moduleTypeId'];rows[key]['sourcePartId']='solid-preserved-material-replacement:'+t
 if key.startswith('porch.brace.')or key=='door.front.trim':remove(r)
# Registered wall-attached posts:1cell high segments, sculpted edges, each supported by stone shoe.
for side,y in [('front',-.04),('rear',12.04)]:
 for x in [.25,7,13.75]:
  rr=root('stone_shoe_0p55',f'facade.{side}.shoe.{x}');box(rr,'shoe',(x,y,.15),(.55,.5,.3),'stone',.025)
  for j in range(5):
   rr=root('timber_post_segment_1',f'facade.{side}.post.{x}.{j}');bar(rr,'post',(x,y,j+.3),(x,y,min(5,j+1.3)),.375,.3)
 for j in range(14):
  rr=root('timber_beam_segment_1',f'facade.{side}.beam.{j}');bar(rr,'beam',(j,y,4.85),(j+1,y,4.85),.32,.34)
# Working porch columns occupy1grid sockets but visible shaped section. Stonebase remains within floor.
for y in [1.5,5.5,10.5]:
 rr=root('porch_stone_shoe',f'porch.shoe.{y}');box(rr,'shoe',(17.75,y,.15),(.6,.6,.3),'stone',.025)
 for j in range(4):
  rr=root('post1'if j<3 else'post0p3',f'porch.post.{y}.{j}');bar(rr,'post',(17.75,y,.3+j),(17.75,y,min(3.6,1.3+j)),.375,.375)
 rr=root('porch_knee_brace',f'porch.brace.refined.{y}');bar(rr,'brace',(17.75,y,2.7),(16.75,y,4.18),.2,.2)
for y in range(1,11):
 rr=root('porch_beam_1',f'porch.beam.{y}');bar(rr,'beam',(17.75,y,3.8),(17.75,y+1,3.8),.4,.4)
# Genuine block-relief stone courses, staggered joints; attached to unchanged structural floor/base.
for y,sign in [(-.045,-1),(12.045,1)]:
 for row in range(4):
  for j in range(15):
   a=max(0,j-(.5 if row%2 else 0));b=min(14,j+1-(.5 if row%2 else 0))
   if b<=a:continue
   rr=root('stone_course_detail',f'stone.{y}.{row}.{j}');box(rr,'block',((a+b)/2,y,-.875+row*.25),(b-a-.018,.13,.235),'stone',.012)
# Projecting double window with true reveal and two underside supports.
r=bpy.data.objects.get('window.frame.front');r.location.y=-.65;rows['window.frame.front']['position']=list(r.location)
rr=root('window_reveal_4x3','window.front.reveal')
for x in[2,6]:box(rr,'deep-side',(x,-.325,2.5),(.18,.65,3.15),'wood',.01)
for z in[1,4]:box(rr,'deep-rail',(4,-.325,z),(4,.65,.16),'wood',.01)
for x in[2.5,5.5]:bar(rr,'sill_support',(x,0,.35),(x,-.78,.92),.16,.16)
for o in C.objects:
 if o.type=='EMPTY'and o.get('logicalPlacementKey','').startswith('shutter.front.'):
  o.location.y=-.75;rows[o['logicalPlacementKey']]['position']=list(o.location)
# Closed volumetric stone arch, infill only above3.2; lower1.8clear remains.
rr=root('stone_arch_segmented_2','door.front.stone_arch')
for x in[8.95,11.05]:
 for j in range(8):box(rr,'jamb',(x,-.18,.2+j*.4),(.3,.42,.385),'stone',.012)
for j in range(12):
 a=j*math.pi/12;b=(j+1)*math.pi/12;verts=[]
 for y in[-.4,.05]:
  for rad,ang in[(.8,a),(.8,b),(1.15,b),(1.15,a)]:verts.append((10+rad*math.cos(ang),y,3.2+rad*math.sin(ang)))
 me=bpy.data.meshes.new('archsegment');me.from_pydata(verts,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);me.update();o=bpy.data.objects.new('stone_arch_piece',me);C.objects.link(o);o.parent=rr;me.materials.append(M['stone'])
# Replace ceramics-filled shelf with actual general repair rack. Keep original joinery bench.
old=bpy.data.objects.get('interior.workshop.drying.primary')
if old:remove(old)
src=D.parents[1]/'aether-gallery-current-20261018/public/functional-softpaint/models/tool_repair_rack.glb';before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(src));new=set(bpy.data.objects)-before
rr=root('reused_tool_repair_rack','interior.tool_repair_rack');tops=[o for o in new if o.parent not in new]
for o in tops:o.parent=rr
for o in new:
 for c in list(o.users_collection):c.objects.unlink(o)
 C.objects.link(o)
bpy.context.view_layer.update();pts=[o.matrix_world@Vector(v)for o in new if o.type=='MESH'for v in o.bound_box];mn=Vector([min(p[i]for p in pts)for i in range(3)]);mx=Vector([max(p[i]for p in pts)for i in range(3)]);rr.location=Vector((2.5,9,0))-Vector(((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z));rows['interior.tool_repair_rack']['position']=list(rr.location);rr['originalSourceGLB']=str(src)
bp['instances']=list(rows.values());bp['status']='FACADE_R2_WORK_ROOF_PENDING';(D/'workshop-facade-r2-blueprint.json').write_text(json.dumps(bp,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(D/'workshop-facade-r2.blend'));print('FACADE',len(rows))
