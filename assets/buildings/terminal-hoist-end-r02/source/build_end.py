import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector
O=Path(__file__).resolve().parents[1];W=O/'source_inputs/warehouse-components';SRC=O/'rollback/L4.glb'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(SRC));mat=bpy.data.materials['SHARED_iron'];bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
objs=[];records=[]
for old,new in [('hoist.r02.rope.eye','terminal.hoist.r02.link'),('hoist.r02.hook.forged','terminal.hoist.r02.hook')]:
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(W/(old+'.glb')));o=next(x for x in set(bpy.data.objects)-before if x.type=='MESH');o.location+=Vector((-1.35,.20,.51-.825));o.name=new;bpy.context.view_layer.update();o.data.materials.clear();o.data.materials.append(mat)
 for p in o.data.polygons:p.material_index=0
 # Existing rope-eye binding wraps are omitted: reuse only its main closed suspension loop.
 if new.endswith('.link'):
  import bmesh
  bm=bmesh.new();bm.from_mesh(o.data);remaining=set(bm.verts);remove=[]
  while remaining:
   todo=[remaining.pop()];group=[]
   while todo:
    v=todo.pop();group.append(v)
    for e in v.link_edges:
     w=e.other_vert(v)
     if w in remaining:remaining.remove(w);todo.append(w)
   if sum((o.matrix_world@v.co).z for v in group)/len(group)>.54:remove.extend(group)
  bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(o.data);bm.free()
 if new.endswith('.hook'):
  import bmesh
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);boundary=[e for e in bm.edges if e.is_boundary];result=bmesh.ops.holes_fill(bm,edges=boundary,sides=0);assert len(result['faces'])==2, len(result['faces']);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 objs.append(o);records.append({'id':new,'adaptedFromOriginalWarehouseComponent':old,'sourceSha256':hashlib.sha256((W/(old+'.glb')).read_bytes()).hexdigest()})
# Hollow ferrule: circular bore encloses existing square 40mm cable (diagonal 56.57mm).
verts=[];faces=[];N=48
for z,r in [(.55,.042),(.69,.042),(.55,.029),(.69,.029)]:
 for i in range(N):a=2*math.pi*i/N;verts.append((r*math.cos(a),r*math.sin(a),z))
for i in range(N):
 j=(i+1)%N
 faces.extend([(i,j,N+j,N+i),(2*N+j,2*N+i,3*N+i,3*N+j),(j,i,2*N+i,2*N+j),(N+i,N+j,3*N+j,3*N+i)])
m=bpy.data.meshes.new('Hollow termination ferrule');m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new('terminal.hoist.r02.termination',m);bpy.context.collection.objects.link(o);o.data.materials.append(mat);sleeve=o;bolts=[]
for sign in [-1,1]:
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.009,depth=.035,location=(sign*.035,0,.64),rotation=(0,math.pi/2,0));bolts.append(bpy.context.object)
bpy.ops.object.select_all(action='DESELECT');sleeve.select_set(True)
for bolt in bolts:bolt.select_set(True)
bpy.context.view_layer.objects.active=sleeve;bpy.ops.object.join();o=sleeve;objs.append(o);records.append({'id':o.name,'originalAuthoredGeometry':True,'boreDiameterMetres':.058,'cableSquareWidthMetres':.04,'outerDiameterMetres':.084})
for o in objs:
 for k in list(o.keys()):del o[k]
 o['instanceId']=o.name;o['moduleTypeId']=o.name;o['original645Contribution']=0;o['runtimeImplemented']=False;o['parentStableId']='cargo.hoist'
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 # Existing component origins remain valid; export author-local placement within hoist root.
 bpy.ops.export_scene.gltf(filepath=str(O/'modules'/(o.name+'.glb')),use_selection=True,export_format='GLB',export_extras=True)
bpy.ops.object.select_all(action='DESELECT')
for o in objs:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(O/'modules/terminal.hoist.end.r02.glb'),use_selection=True,export_format='GLB',export_extras=True)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(O/'source/terminal.hoist.end-r02-editable.blend'))
for rec,o in zip(records,objs):
 ps=[o.matrix_world@v.co for v in o.data.vertices];rec.update(pivotSourceZUp=list(o.location),pivotGltfYUp=[o.location.x,o.location.z,-o.location.y],boundsSourceZUp={'min':[min(p[i] for p in ps) for i in range(3)],'max':[max(p[i] for p in ps) for i in range(3)]},parentId='cargo.hoist',original645Contribution=0,interfacesOnly=True,runtimeImplemented=False)
(O/'component-catalog.json').write_text(json.dumps(records,indent=2));print('BUILT')
