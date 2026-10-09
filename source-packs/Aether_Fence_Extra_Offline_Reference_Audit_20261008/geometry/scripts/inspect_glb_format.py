"""Read mesh accessor bytes and UV bindings from actual GLBs; not GPU/runtime memory measurement."""
import json,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def inspect(path):
    b=path.read_bytes();assert b[:4]==b'glTF'
    n,t=struct.unpack_from('<II',b,12);j=json.loads(b[20:20+n])
    p=j['meshes'][0]['primitives'][0];streams={};total=0
    components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
    sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
    for name,idx in p['attributes'].items():
        a=j['accessors'][idx];size=a['count']*components[a['type']]*sizes[a['componentType']]
        streams[name]={'count':a['count'],'type':a['type'],'componentType':a['componentType'],'payload_bytes':size}
        total+=size
    idx=j['accessors'][p['indices']];index_bytes=idx['count']*sizes[idx['componentType']]
    material=j['materials'][p['material']]
    base=material.get('pbrMetallicRoughness',{}).get('baseColorTexture',{})
    return {'file':str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
      'file_bytes':len(b),'attributes':streams,'material_basecolor_texcoord':base.get('texCoord',0),
      'material_double_sided':material.get('doubleSided',False),
      'index_count':idx['count'],'index_componentType':idx['componentType'],'index_payload_bytes':index_bytes,
      'mesh_accessor_payload_bytes':total+index_bytes,'scope':'Actual serialized GLB accessors; excludes GPU alignment, upload buffers, engine duplication and all textures. No chunk runtime memory claim.'}

def main():
    result=[]
    for path in sorted((ROOT/'exports').glob('*mobile_candidate.glb')):
        got=inspect(path);assert 'TEXCOORD_0' in got['attributes']
        assert 'TEXCOORD_1' not in got['attributes'];assert got['material_basecolor_texcoord']==0
        assert not got['material_double_sided']
        old=ROOT/'revisions'/'v01'/'exports'/path.name
        prev=inspect(old)
        removed=prev['attributes'].get('TEXCOORD_1',{}).get('payload_bytes',0)
        assert prev['mesh_accessor_payload_bytes']-got['mesh_accessor_payload_bytes']==removed
        got['secondary_optimization_removed_unused_uv1_payload_bytes']=removed
        got['old_export_accessor_bytes']=prev['mesh_accessor_payload_bytes']
        result.append(got)
    (ROOT/'reports'/'glb-format-audit.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))

if __name__=='__main__':main()
