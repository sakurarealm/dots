from pathlib import Path
import json,struct,hashlib,copy,shutil
O=Path(__file__).resolve().parents[1];R=O.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
def write(p,g,b):
 g['buffers']=[{'byteLength':len(b)}];j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);p.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(j)+len(b))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(b),b'BIN\0')+b)
a,ab=read(O/'modules/terminal.hoist.end.r02.glb');assert len(a['nodes'])==3;rows=[]
for lvl,folder,expected in [(4,'03-terminal-L3-L4','a6fcb5dc0f86dc2ad533dbae2f2c5ad44ed9cc197ec4707c6b9ed77853909d62'),(5,'04-terminal-L5-and-starter-GLB','e3b038c7c7e96fc918696d84a56b87e985f832e8fa36a8901901d32e8a3e7908')]:
 src=O/'rollback'/f'L{lvl}.glb';assert sha(src)==expected;g,b=read(src);old=copy.deepcopy(g);buf=bytearray(b);buf.extend(b'\0'*((-len(buf))%4));offset=len(buf);buf.extend(ab);vb=len(g['bufferViews']);ac=len(g['accessors']);mb=len(g['meshes']);nb=len(g['nodes']);root=next(i for i,n in enumerate(g['nodes']) if n.get('extras',{}).get('instanceId')=='cargo.hoist')
 for v in a['bufferViews']:
  x=copy.deepcopy(v);x['byteOffset']=x.get('byteOffset',0)+offset;x['buffer']=0;g['bufferViews'].append(x)
 for x in a['accessors']:
  x=copy.deepcopy(x);x['bufferView']+=vb;g['accessors'].append(x)
 for m in a['meshes']:
  m=copy.deepcopy(m)
  for p in m['primitives']:p['attributes']={k:v+ac for k,v in p['attributes'].items()};p['indices']+=ac;p['material']=1
  g['meshes'].append(m)
 for n in a['nodes']:
  n=copy.deepcopy(n);n['mesh']+=mb;g['nodes'].append(n)
 g['nodes'][root]['children']+=list(range(nb,nb+len(a['nodes'])))
 for i,n in enumerate(old['nodes']):
  if i!=root:assert n==g['nodes'][i]
  else:assert {k:v for k,v in n.items() if k!='children'}=={k:v for k,v in g['nodes'][i].items() if k!='children'};assert g['nodes'][i]['children'][:len(n['children'])]==n['children']
 assert g['meshes'][:mb]==old['meshes'];assert g['accessors'][:ac]==old['accessors'];assert g['bufferViews'][:vb]==old['bufferViews'];assert buf[:len(b)]==b
 for k in old:
  if k not in ['buffers','bufferViews','accessors','meshes','nodes']:assert old[k]==g[k]
 dst=O/'reproduced-stages'/src.name;dst.parent.mkdir(exist_ok=True);write(dst,g,buf)
 rows.append({'stage':lvl,'sourceSha256':expected,'outputSha256':sha(dst),'rootIndex':root,'originalNodesUnchangedExceptAppendingRootChildren':True,'allOriginalMeshesAccessorsViewsBinaryExact':True,'originalMaterialsTexturesImagesExact':True,'newExtensionNodes':len(a['nodes']),'original645Contribution':0})
(O/'validation/portable-reproduction.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
