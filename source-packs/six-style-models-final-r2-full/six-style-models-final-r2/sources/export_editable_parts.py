"""Low-RAM editable per-part GLB source, alongside the optimized 3-primitive GLB."""
from pathlib import Path
import json,struct,sys,hashlib
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
style,name=sys.argv[1:3];runtime=ROOT/'models'/f'{style}_{name}.glb';raw=runtime.read_bytes();jl,_=struct.unpack_from('<I4s',raw,12);old=json.loads(raw[20:20+jl]);offset=20+jl;bl,_=struct.unpack_from('<I4s',raw,offset);original=raw[offset+8:offset+8+bl]
recipe=json.loads((ROOT/'recipes'/f'{style}_{name}.json').read_text());z=np.load(runtime.with_suffix('.npz'));blob=bytearray();views=[];access=[];meshes=[];nodes=[]
def bytes_view(data,target=None):
    while len(blob)%4:blob.append(0)
    start=len(blob);blob.extend(data);v={'buffer':0,'byteOffset':start,'byteLength':len(data)}
    if target:v['target']=target
    views.append(v);return len(views)-1
def acc(a,typ,component,target):
    v=bytes_view(a.tobytes(),target);q={'bufferView':v,'componentType':component,'count':len(a),'type':typ}
    if typ=='VEC3':q['min']=a.min(axis=0).tolist();q['max']=a.max(axis=0).tolist()
    access.append(q);return len(access)-1
for i,part in enumerate(recipe['compiled_parts']):
    start,n=part['triangle_start'],part['triangle_count'];p=z['position'][start:start+n].reshape(-1,3);normal=z['normal'][start:start+n].reshape(-1,3);uv=z['uv'][start:start+n].reshape(-1,2);center=(p.min(axis=0)+p.max(axis=0))/2;local=p-center
    local=np.column_stack((local[:,0],local[:,2],-local[:,1])).astype('<f4');normal=np.column_stack((normal[:,0],normal[:,2],-normal[:,1])).astype('<f4');uv=uv.astype('<f4');ix=np.arange(len(p),dtype='<u4');mid=int(z['material'][start])
    pi=acc(local,'VEC3',5126,34962);ni=acc(normal,'VEC3',5126,34962);ui=acc(uv,'VEC2',5126,34962);ii=acc(ix,'SCALAR',5125,34963);label=f'{i:03d} {part["name"]}'
    meshes.append({'name':label,'primitives':[{'attributes':{'POSITION':pi,'NORMAL':ni,'TEXCOORD_0':ui},'indices':ii,'material':mid,'mode':4}]});nodes.append({'name':label,'mesh':len(meshes)-1,'translation':[float(center[0]),float(center[2]),float(-center[1])],'extras':{'semantic_role':part['color_role'],'surface':part['surface'],'atlas_cell_top_left_index':part['atlas_cell_top_left_index']}})
images=[]
for im in old['images']:
    v=old['bufferViews'][im['bufferView']];data=original[v['byteOffset']:v['byteOffset']+v['byteLength']];images.append({'bufferView':bytes_view(data),'mimeType':im['mimeType']})
while len(blob)%4:blob.append(0)
doc={'asset':{'version':'2.0','generator':'Editable per-part premium prop source'},'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'materials':old['materials'],'textures':old['textures'],'images':images,'samplers':old['samplers'],'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':access,'extras':{'source':'Actual named, separately transformable mesh parts; optimized counterpart is '+runtime.name,'style_direction':style,'geometry_scope':'Same triangles/UVs/normals as the optimized actual GLB, local pivots centered per part. Higher draw calls are for editing only. Not Blender/Unity/runtime validation.'}}
j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);data=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(blob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\0')+blob;out=ROOT/'models'/f'{style}_{name}_editable_parts.glb';out.write_bytes(data)
report={'file':out.name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'separately_editable_mesh_nodes':len(nodes),'triangles':int(len(z['position'])),'same_runtime_mesh_source':runtime.name,'materials':len(doc['materials']),'purpose':'Editable source, not optimized runtime draw-call budget'};(ROOT/'validation'/f'{style}_{name}_editable_parts.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
