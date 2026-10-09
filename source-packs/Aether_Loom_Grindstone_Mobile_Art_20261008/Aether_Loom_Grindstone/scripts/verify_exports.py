#!/usr/bin/env python3
"""Blender-only FBX/GLB roundtrip QA; excludes engine and device acceptance."""
import bpy,json,math,hashlib,datetime,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];REPORT=[]
for asset in ['grindstone','loom']:
 out=ROOT/asset/'final'
 if not (out/'manifest.json').exists():continue
 expected=json.load(open(out/'manifest.json'));source=json.load(open(out/'runtime_mesh_qa.json'))
 for ext in ['fbx','glb']:
  bpy.ops.wm.read_factory_settings(use_empty=True) # Clears hidden editable parts as well as visible objects.
  path=out/(asset+'.'+ext)
  if ext=='fbx':bpy.ops.import_scene.fbx(filepath=str(path),use_anim=False)
  else:bpy.ops.import_scene.gltf(filepath=str(path))
  meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];tri=0;vs=[];missing_uv=[];zero=0;uvzero=0
  for o in meshes:
   me=o.data;me.calc_loop_triangles();tri+=len(me.loop_triangles);vs.extend([o.matrix_world@v.co for v in me.vertices]);zero+=sum(t.area<1e-10 for t in me.loop_triangles)
   uv=me.uv_layers.active
   if not uv:missing_uv.append(o.name);continue
   for t in me.loop_triangles:
    pts=[uv.data[i].uv for i in t.loops];a=abs(sum(pts[i].x*pts[(i+1)%3].y-pts[(i+1)%3].x*pts[i].y for i in range(3))/2);uvzero+=a<1e-10
  lo=[min(v[i] for v in vs) for i in range(3)];hi=[max(v[i] for v in vs) for i in range(3)];dims=[hi[i]-lo[i] for i in range(3)]
  # Imported exporters may reorient axes; compare sorted dimensions and translation-invariant centre.
  err=max(abs(a-b) for a,b in zip(sorted(dims),sorted(expected['dimensions_m'])))
  allobjs=list(bpy.context.scene.objects);rootobjs=[o for o in allobjs if o.name.startswith('Aether_') and o.type=='EMPTY'];anchors=[o.name for o in allobjs if o.type=='EMPTY']
  roots_at_origin=all(o.matrix_world.translation.length<1e-5 for o in rootobjs)
  row={'asset':asset,'format':ext,'triangles':tri,'expected_triangles':expected['triangles'],'triangle_difference':tri-expected['triangles'],'mesh_count':len(meshes),'dimensions_imported_m':dims,'dimension_error_m':err,'finite_vertices':all(math.isfinite(c) for v in vs for c in v),'missing_uv_meshes':missing_uv,'zero_area_triangles':zero,'zero_uv_triangles':uvzero,'root_at_origin':roots_at_origin,'anchors':anchors,'materials':sorted(set(m.name for o in meshes for m in o.data.materials if m)),'imported_texture_images':sorted(im.name for im in bpy.data.images if im.source=='FILE' and im.size[0]>0),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
  row['passed']=tri==expected['triangles'] and err<1e-5 and row['finite_vertices'] and not missing_uv and zero==0 and uvzero==0 and roots_at_origin
  REPORT.append(row)
 for ext in ['blend']:
  bpy.ops.wm.open_mainfile(filepath=str(out/(asset+'.blend')))
  runtime=[o for o in bpy.data.collections['ASSET'].objects if o.type=='MESH'];vv=[o.matrix_world@v.co for o in runtime for v in o.data.vertices]
  qa_path=out/'runtime_mesh_qa.json';q=json.load(open(qa_path));q['bounds_min_m']=[min(v[i] for v in vv) for i in range(3)];q['bounds_max_m']=[max(v[i] for v in vv) for i in range(3)];q['dimensions_m']=[q['bounds_max_m'][i]-q['bounds_min_m'][i] for i in range(3)];q['bounds_verified_after_source_reopen']=True;qa_path.write_text(json.dumps(q,indent=2))
  REPORT.append({'asset':asset,'format':'blend_reopen' ,'passed':bpy.data.collections.get('ASSET') is not None and bpy.data.collections.get('SOURCE_PARTS_EDITABLE') is not None,'packed_images':sum(im.packed_file is not None for im in bpy.data.images),'source_parts_hidden':bpy.data.collections['SOURCE_PARTS_EDITABLE'].hide_render,'scope':'Reopen source and verify runtime/editable separation, not full animation evaluation'})
r={'created_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Blender 4.3.2 export/reimport and source-reopen only. No Unity or device test.','checks':REPORT,'passed':all(x['passed'] for x in REPORT)}
(ROOT/'roundtrip_report.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))
if not r['passed']:raise RuntimeError('Roundtrip failed; inspect report')
