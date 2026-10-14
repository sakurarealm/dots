"""Apply only the reviewed sink delta to exact bundled rollback inputs. Offline stdlib only."""
from pathlib import Path
import json,struct,hashlib,base64,copy
O=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
payload=json.loads((O/'source/reviewed-mouth-delta.json').read_text())
for record in json.loads((O/'validation/stage-preservation.json').read_text()):
 src=O/'rollback'/(record['stage']+'.glb');assert sha(src)==record['sourceSha256']
 b=src.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);buf=bytearray(b[28+n:]);node=g['nodes'][record['nodeIndex']];assert node==record['node'];mesh=g['meshes'][record['meshIndex']]
 def add(key):
  p=payload[key];a=copy.deepcopy(p['accessor']);v=copy.deepcopy(p['view']);data=base64.b64decode(p['bytesBase64']);buf.extend(b'\0'*((-len(buf))%4));v.update(buffer=0,byteOffset=len(buf),byteLength=len(data));buf.extend(data);a['bufferView']=len(g['bufferViews']);g['bufferViews'].append(v);g['accessors'].append(a);return len(g['accessors'])-1
 mesh['primitives'][3]['indices']=add('keptIndices');new={'attributes':{k:add(k) for k in ['POSITION','NORMAL','TEXCOORD_0']},'indices':add('newIndices'),'material':mesh['primitives'][3]['material']};mesh['primitives'].append(new)
 g['buffers']=[{'byteLength':len(buf)}];j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);out=struct.pack('<4sII',b'glTF',2,28+len(j)+len(buf))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(buf),b'BIN\0')+buf
 assert hashlib.sha256(out).hexdigest()==record['outputSha256']
 dst=O/'reproduced-stages'/(record['stage']+'.glb');dst.parent.mkdir(exist_ok=True);dst.write_bytes(out);print(record['stage'],hashlib.sha256(out).hexdigest())
