import bpy,json,pathlib,math
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=pathlib.Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene
models={}
for key,filename,name in [('baseline','aether_wooden_barrel_v01_sample.blend','aether_wooden_barrel_v01'),('LOD1','aether_wooden_barrel_v01_LOD1.blend','aether_wooden_barrel_v01_LOD1')]:
 with bpy.data.libraries.load(str(ROOT/'source'/filename),link=False) as (src,dst):dst.objects=[name]
 o=dst.objects[0];s.collection.objects.link(o);o.data.calc_loop_triangles();models[key]=o
camd=bpy.data.cameras.new('QA_projection');cam=bpy.data.objects.new('QA_projection',camd);s.collection.objects.link(cam);s.camera=cam;camd.type='ORTHO';camd.ortho_scale=1.58;s.render.resolution_x=512;s.render.resolution_y=512
out={'scope':'Geometric projected silhouette union of actual triangles at four fixed orthographic views, 512px; excludes shadows/texture/lighting. Frozen comparison carrier is untouched.','models':{},'views':[]}
for k,o in models.items():out['models'][k]={'triangles':len(o.data.loop_triangles),'vertices':len(o.data.vertices),'dimensions_m':list(o.dimensions),'faces':[list(t.vertices) for t in o.data.loop_triangles]}
for i in range(4):
 angle=-math.pi/3+i*math.pi/2;cam.location=(3.4*math.cos(angle),3.4*math.sin(angle),1.65);cam.rotation_euler=(Vector((0,0,.51))-cam.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update();v={'index':i,'projected':{}}
 for k,o in models.items():
  vv=[world_to_camera_view(s,cam,o.matrix_world@x.co) for x in o.data.vertices];v['projected'][k]=[[x.x*512,(1-x.y)*512] for x in vv]
 out['views'].append(v)
def loop_uv(o):
 d={}
 for poly in o.data.polygons:
  for i in poly.loop_indices:
   co=tuple(round(v,6) for v in o.data.vertices[o.data.loops[i].vertex_index].co);d.setdefault(co,[]).append(tuple(o.data.uv_layers['UV0'].data[i].uv))
 return d
b,l=loop_uv(models['baseline']),loop_uv(models['LOD1']);matched=[]
for co,uvs in l.items():
 if co in b:
  for uv in uvs:matched.append(min(math.dist(uv,other) for other in b[co]))
out['uv_comparison']={'main_mapping_formula':'Same directional stave mapping and lid mapping; no atlas rebake. LOD removes chamfer/rivet topology and lowers lid perimeter subdivisions.','matching_coordinate_keys':len(set(b)&set(l)),'matched_uv_loops':len(matched),'maximum_uv_distance_retained_coordinate':max(matched) if matched else None,'mean_uv_distance_retained_coordinate':sum(matched)/len(matched) if matched else None,'qualification':'Only retained positions within 1e-6m are compared; removed/new chamfer positions do not have 1:1 UV correspondences.'}
(ROOT/'reports/lod_projection_raw.json').write_text(json.dumps(out,separators=(',',':')))
print('PROJECTED',[(k,out['models'][k]['triangles']) for k in models])
