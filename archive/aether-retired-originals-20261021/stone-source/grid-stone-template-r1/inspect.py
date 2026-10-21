import bpy,json
from mathutils import Vector
from pathlib import Path
D=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(D.parent/'workshop-levels-L5-rooftop-cloud-r9c/rooftop-cloud.blend'))
a=[]
for r in bpy.data.objects:
 k=r.get('logicalPlacementKey','')
 if k.startswith('stone.-') or k in ['cell.3.0.-1','cell.4.0.-1','cell.5.0.-1']:
  ps=[o.matrix_world@v.co for o in r.children_recursive if o.type=='MESH' for v in o.data.vertices]
  if ps:a.append({'name':r.name,'key':k,'type':r.get('moduleTypeId'),'loc':list(r.location),'bounds':[[min(v[i]for v in ps)for i in range(3)],[max(v[i]for v in ps)for i in range(3)]],'materials':list(set(m.name for o in r.children_recursive if o.type=='MESH' for m in o.data.materials))})
(D/'baseline-inspection.json').write_text(json.dumps(a,indent=2));print(json.dumps(a[:12]))
