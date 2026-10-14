import json,struct,numpy as np
from pathlib import Path
O=Path(__file__).resolve().parents[1]
def load(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
def mat(n):
 if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
 x,y,z,w=n.get('rotation',[0,0,0,1]);m=np.eye(4);m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
rows=[]
for L in [4,5]:
 g,b=load(O/'stages'/f'L{L}.glb');parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])};cache={}
 def wm(i):
  if i not in cache:cache[i]=(wm(parents[i]) if i in parents else np.eye(4))@mat(g['nodes'][i])
  return cache[i]
 boxes={}
 for i,n in enumerate(g['nodes']):
  if 'mesh' not in n:continue
  pts=[]
  for p in g['meshes'][n['mesh']]['primitives']:
   a=g['accessors'][p['attributes']['POSITION']];v=g['bufferViews'][a['bufferView']];q=np.frombuffer(b,dtype='<f4',count=a['count']*3,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,3);q=np.c_[q,np.ones(len(q))]@wm(i).T;pts.extend(q[:,:3])
  pts=np.array(pts);boxes[i]=(pts.min(0),pts.max(0))
 new=[i for i,n in enumerate(g['nodes']) if n.get('name','').startswith('terminal.hoist.r02.')];checks=[]
 for i in new:
  lo,hi=boxes[i];hits=[]
  for j,(a,z) in boxes.items():
   if j in new:continue
   ov=np.minimum(hi,z)-np.maximum(lo,a)
   if np.all(ov>1e-6):hits.append({'nodeIndex':j,'name':g['nodes'][j]['name'],'overlapAABB':ov.tolist()})
  checks.append({'component':g['nodes'][i]['name'],'boundsGltfYUp':[lo.tolist(),hi.tolist()],'originalGeometryAABBCandidates':hits})
 rows.append({'stage':L,'components':checks,'broadPhaseOnly':True})
(O/'validation/clearance-aabb.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
