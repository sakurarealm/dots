"""Narrow local geometry patch: replace only the two downpipe bottom-cap triangles.
All original buffers are preserved byte-for-byte; non-target primitive metadata remains unchanged.
"""
import json,struct,hashlib,copy,shutil
from pathlib import Path
import numpy as np
O=Path(__file__).resolve().parents[1];ROOT=O.parent
SRC=O/'rollback/kitchen.sink.glb'
EXPECTED='7480bca515e28f319706498f87971599381a927b3ed1913fa28ce3bb549b178c'
b=SRC.read_bytes();assert hashlib.sha256(b).hexdigest()==EXPECTED;n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);orig=copy.deepcopy(g);oldbin=b[28+n:];binary=bytearray(oldbin)
def array(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];return np.frombuffer(oldbin,dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']],offset=v.get('byteOffset',0)+a.get('byteOffset',0),count=a['count']*{'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]).reshape(a['count'],-1)
pidx=next(i for i,p in enumerate(g['meshes'][0]['primitives']) if g['materials'][p['material']]['name']=='Kitchen aged copper');p=g['meshes'][0]['primitives'][pidx];v=array(p['attributes']['POSITION']);ix=array(p['indices']).ravel().reshape(-1,3);remove=[]
for k,t in enumerate(ix):
 pts=v[t]
 if np.max(np.abs(pts[:,1]-1.59))<1e-5 and np.all(np.abs(pts[:,0]-.37)<.04) and np.all(np.abs(pts[:,2]+.03)<.04):remove.append(k)
assert remove==[300,301];cap=v[ix[remove]].reshape(-1,3);x0,x1=float(cap[:,0].min()),float(cap[:,0].max());z0,z1=float(cap[:,2].min()),float(cap[:,2].max());bottom=float(cap[0,1]);cx=(x0+x1)/2;cz=(z0+z1)/2;half=.008;top=bottom+.055
outer=[(x0,bottom,z0),(x1,bottom,z0),(x1,bottom,z1),(x0,bottom,z1)]
inner=[(cx-half,bottom,cz-half),(cx+half,bottom,cz-half),(cx+half,bottom,cz+half),(cx-half,bottom,cz+half)]
upper=[(x,top,z) for x,y,z in inner];faces=[]
for i in range(4):
 j=(i+1)%4;faces.append([outer[i],outer[j],inner[j],inner[i]]);faces.append([inner[i],inner[j],upper[j],upper[i]])
faces.append(upper)
positions=[];normals=[];uv=[]
for f in faces:
 pts=np.array(f,dtype=float);normal=np.cross(pts[1]-pts[0],pts[2]-pts[0]);normal/=np.linalg.norm(normal)
 for i in [0,1,2,0,2,3]:positions.append(f[i]);normals.append(normal);uv.append([pts[i,0]*.55,pts[i,2]*.55])
def append(a,typ,component,target):
 a=np.ascontiguousarray(a);binary.extend(b'\0'*((-len(binary))%4));off=len(binary);raw=a.tobytes();binary.extend(raw);vi=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(raw),'target':target});ai=len(g['accessors']);item={'bufferView':vi,'componentType':component,'count':len(a),'type':typ}
 if typ=='VEC3':item['min']=a.min(axis=0).tolist();item['max']=a.max(axis=0).tolist()
 g['accessors'].append(item);return ai
kept=np.delete(ix,remove,axis=0).ravel().astype('<u2');p['indices']=append(kept,'SCALAR',5123,34963)
p2={'attributes':{'POSITION':append(np.array(positions,dtype='<f4'),'VEC3',5126,34962),'NORMAL':append(np.array(normals,dtype='<f4'),'VEC3',5126,34962),'TEXCOORD_0':append(np.array(uv,dtype='<f4'),'VEC2',5126,34962)},'indices':append(np.arange(len(positions),dtype='<u2'),'SCALAR',5123,34963),'material':p['material']};g['meshes'][0]['primitives'].append(p2)
binary.extend(b'\0'*((-len(binary))%4));g['buffers']=[{'byteLength':len(binary)}];js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);dst=O/'modules/kitchen.sink.glb';dst.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(js)+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary)
for im in g.get('images',[]):
 if 'uri' in im:
  source=(SRC.parent/im['uri']).resolve();target=(dst.parent/im['uri']).resolve();assert target.is_relative_to(O);target.parent.mkdir(parents=True,exist_ok=True);
  if source != target: shutil.copy2(source,target)
  assert source.read_bytes()==target.read_bytes()
checks={'sourceSha256Before':EXPECTED,'sourceSha256After':hashlib.sha256(SRC.read_bytes()).hexdigest(),'outputSha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'nodesExact':g['nodes']==orig['nodes'],'materialsTexturesImagesSamplersExact':all(g.get(k)==orig.get(k) for k in ['materials','textures','images','samplers']),'originalBinaryPrefixExact':binary[:len(oldbin)]==oldbin,'originalAccessorsExact':g['accessors'][:len(orig['accessors'])]==orig['accessors'],'originalBufferViewsExact':g['bufferViews'][:len(orig['bufferViews'])]==orig['bufferViews'],'nonCopperPrimitivesExact':all(p==g['meshes'][0]['primitives'][i] for i,p in enumerate(orig['meshes'][0]['primitives']) if i!=pidx),'copperOriginalAttributesExact':p['attributes']==orig['meshes'][0]['primitives'][pidx]['attributes'],'removedOnlyTriangleIndices':remove,'remainingOriginalCopperTrianglesExact':np.array_equal(kept.reshape(-1,3),np.delete(ix,remove,axis=0)),'addedTriangles':18,'netTriangleChange':16,'outerContourUnchanged':True,'openingInnerWidthMetres':.016,'minimumRimThicknessMetres':min(x1-x0,z1-z0)/2-half,'cavityDepthMetres':.055,'cavityCeilingSourceZUp':top,'moduleIdUnchanged':'kitchen.sink','stageFilesModified':False,'runtimeOrFluidValidation':False}
assert all(checks[k] for k in ['nodesExact','materialsTexturesImagesSamplersExact','originalBinaryPrefixExact','originalAccessorsExact','originalBufferViewsExact','nonCopperPrimitivesExact','copperOriginalAttributesExact','remainingOriginalCopperTrianglesExact'])
(O/'validation/preservation.json').write_text(json.dumps(checks,indent=2));print(json.dumps(checks,indent=2))
