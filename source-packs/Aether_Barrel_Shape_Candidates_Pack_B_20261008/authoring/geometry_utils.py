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

