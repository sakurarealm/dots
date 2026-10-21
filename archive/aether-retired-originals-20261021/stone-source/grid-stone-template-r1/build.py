import bpy,bmesh,json,hashlib,shutil
from pathlib import Path
from mathutils import Vector,Matrix
D=Path(__file__).resolve().parent;BASE=D.parent/'workshop-levels-L5-rooftop-cloud-r9c/rooftop-cloud.blend'
bpy.ops.wm.open_mainfile(filepath=str(BASE));C=bpy.data.collections['WORKSHOP_SAMPLE']
def digest(o):
 a={'matrix':[list(v)for v in o.matrix_world],'props':{k:str(v)for k,v in o.items()},'type':o.type}
 if o.type=='MESH':a.update(vertices=[list(v.co)for v in o.data.vertices],polygons=[list(p.vertices)for p in o.data.polygons],materials=[m.name for m in o.data.materials])
 return hashlib.sha256(json.dumps(a,sort_keys=True).encode()).hexdigest()
def bounds(o):
 p=[o.matrix_world@v.co for v in o.data.vertices];return [[min(v[i]for v in p)for i in range(3)],[max(v[i]for v in p)for i in range(3)]]
def clip(o,axis,cut,keep_less):
 # Convert world cutting plane to local coordinates; mesh copy avoids shared-data mutation.
 o.data=o.data.copy();bm=bmesh.new();bm.from_mesh(o.data)
 inv=o.matrix_world.inverted();co=inv@Vector(tuple(cut if i==axis else 0 for i in range(3)));no=o.matrix_world.to_3x3().transposed()@Vector(tuple(1 if i==axis else 0 for i in range(3)))
 r=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,plane_co=co,plane_no=no,clear_outer=keep_less,clear_inner=not keep_less)
 es=[e for e in bm.edges if e.is_boundary];bmesh.ops.holes_fill(bm,edges=es,sides=0);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
before={o.name:digest(o)for o in C.objects};changed=set();mapping=[]
for r in [o for o in C.objects if o.type=='EMPTY']: 
 k=r.get('logicalPlacementKey','')
 if not k.startswith('stone.-0.045.'):continue
 for o in list(r.children_recursive):
  if o.type!='MESH':continue
  lo,hi=bounds(o)
  if hi[0]<=3 or lo[0]>=6:continue
  changed.update([r.name,o.name]);targets=[f'stone.grid.front.{x}.0.-1'for x in range(3,6)if hi[0]>x and lo[0]<x+1]
  item={'stableLogicalKey':k,'oldBounds':[lo,hi],'replacementKeys':targets,'remainingLegacyRoot':None}
  if lo[0]<3:clip(o,0,3,True);item['remainingLegacyRoot']=k;item['retainedRegion']='X<=3'
  elif hi[0]>6:clip(o,0,6,False);item['remainingLegacyRoot']=k;item['retainedRegion']='X>=6'
  else:bpy.data.objects.remove(o,do_unlink=True)
  mapping.append(item)
 if not r.children:bpy.data.objects.remove(r,do_unlink=True)
# Fixed recipe: quarter-height running bond. Odd courses are clipped at tile bounds
# WITHOUT new edge bevel: neighbouring half pieces meet seamlessly at integer tile edges.
parts=[]
for row in range(4):
 for a,b in ([(0,1)]if row%2==0 else[(-.5,.5),(.5,1.5)]):
  bpy.ops.mesh.primitive_cube_add(size=1,location=((a+b)/2,-.045,.125+row*.25));o=bpy.context.object;o.dimensions=(b-a-.018,.13,.235);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  mod=o.modifiers.new('authored_edge','BEVEL');mod.width=.012;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name);o.data.materials.append(bpy.data.materials['stone']);bpy.context.view_layer.update()
  if a<0:clip(o,0,0,False)
  if b>1:clip(o,0,1,True)
  parts.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();template=bpy.context.object
# Bake ALL fixed recipe coordinates once into mesh. Instances get zero child offsets.
template.data.transform(template.matrix_world);template.matrix_world=Matrix.Identity(4);mesh=template.data;mesh.name='stone_facing_1x1_depth013_recipe_r1'
uv=mesh.uv_layers.active or mesh.uv_layers.new()
for poly in mesh.polygons:
 axes=[i for i in range(3)if i!=max(range(3),key=lambda i:abs(poly.normal[i]))]
 for li in poly.loop_indices:
  v=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(v[axes[0]],v[axes[1]])
bpy.data.objects.remove(template,do_unlink=True)
instances=[]
for x in range(3,6):
 key=f'stone.grid.front.{x}.0.-1';r=bpy.data.objects.new(key,None);C.objects.link(r);r.location=(x,0,-1)
 for k,v in {'logicalPlacementKey':key,'stableLogicalKey':key,'moduleTypeId':'workshop.stone_facing_1x1_r1','sourcePartId':'stone-facing-uniform-recipe-r1','gridAnchor':[x,0,-1],'role':'wall_facing_dependent','supportKey':f'cell.{x}.0.-1','installationPlane':'local Y=0; normal -Y'}.items():r[k]=v
 o=bpy.data.objects.new(key+'.surface',mesh);C.objects.link(o);o.parent=r;o.location=(0,0,0);o['parentDependency']=key
 instances.append({'stableLogicalKey':key,'anchor':[x,0,-1],'supportKey':f'cell.{x}.0.-1','childOffset':[0,0,0]})
bpy.context.view_layer.update();actual=[[min(v.co[i]for v in mesh.vertices)for i in range(3)],[max(v.co[i]for v in mesh.vertices)for i in range(3)]]
untouched={n:d for n,d in before.items()if n not in changed};fail=[n for n,d in untouched.items()if n not in bpy.data.objects or digest(bpy.data.objects[n])!=d]
assert not fail,fail
# Geometry topology and anchor tests.
bm=bmesh.new();bm.from_mesh(mesh);nonmanifold=sum(not e.is_manifold for e in bm.edges);bm.free();assert nonmanifold==0
assert abs(actual[1][1]-actual[0][1]-.13)<1e-6
assert actual[0][0]>=-1e-6 and actual[1][0]<=1.000001
assert len({bpy.data.objects[i['stableLogicalKey']+'.surface'].data.as_pointer()for i in instances})==1
report={'status':'AUTHOR_TESTS_PASS_PENDING_INDEPENDENT_REVIEW','baselineSHA256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'uniformRecipeSharedMesh':True,'nonmanifoldEdges':nonmanifold,'actualLocalGeometryBounds':actual,'installationCellBounds':[[0,0,0],[1,0,1]],'supportRequired':'1x1x1 solid cell behind Y=0; surface is NOT wall thickness','depth':.13,'unchangedObjectCount':len(untouched),'unchangedObjectFailures':fail,'changedOldObjects':sorted(changed),'instances':instances,'replacementMapping':mapping,'remainingScope':'Only front X[3,6], Z[-1,0] migrated; outside legacy bricks remain non-grid.'}
(D/'migration-and-tests.json').write_text(json.dumps(report,indent=2))
(D/'unchanged-object-digests.json').write_text(json.dumps(untouched,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(D/'stone-grid-trial.blend'))
bpy.ops.export_scene.gltf(filepath=str(D/'stone-grid-trial.glb'),export_format='GLB',export_extras=True,use_selection=False)
shutil.copy2(D.parent/'workshop-r1/refine_facade_r2.py',D/'legacy-refine_facade_r2.py')
print('DONE',json.dumps({k:report[k]for k in ['actualLocalGeometryBounds','unchangedObjectCount','nonmanifoldEdges']}))
