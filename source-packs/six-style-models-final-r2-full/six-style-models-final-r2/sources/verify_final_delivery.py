"""Independent final delivery verification; read-only on GLBs and previews.
Checks serialized geometry, separately editable node transforms and embedded images.
It does not invoke Blender, Unity, Codex or a game executor.
"""
from pathlib import Path
from io import BytesIO
import json, struct, hashlib, resource, datetime
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def parse(p):
 raw=p.read_bytes(); magic,ver,total=struct.unpack_from('<4sII',raw)
 assert (magic,ver,total)==(b'glTF',2,len(raw))
 size,typ=struct.unpack_from('<I4s',raw,12);assert typ==b'JSON';doc=json.loads(raw[20:20+size]);off=20+size
 size,typ=struct.unpack_from('<I4s',raw,off);assert typ==b'BIN\0';blob=raw[off+8:off+8+size]
 assert len(blob)==size
 for v in doc['bufferViews']:assert v.get('byteOffset',0)+v['byteLength']<=len(blob)
 def acc(i):
  a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];cols={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']]
  return np.frombuffer(blob,dtype=dt,count=a['count']*cols,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,cols)
 images=[]
 for im in doc['images']:
  assert im['mimeType']=='image/png';v=doc['bufferViews'][im['bufferView']];b=blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];pic=Image.open(BytesIO(b));pic.load();images.append({'sha256':hashlib.sha256(b).hexdigest(),'dimensions':list(pic.size),'bytes':len(b)})
 return doc,acc,images
records=[]
for path in sorted((ROOT/'models').glob('*.glb')):
 if path.stem.endswith('_editable_parts'):continue
 doc,acc,images=parse(path);z=np.load(path.with_suffix('.npz'));rec=json.loads((ROOT/'recipes'/f'{path.stem}.json').read_text());build=json.loads((ROOT/'validation'/f'{path.stem}_build.json').read_text());pre=json.loads((ROOT/'validation'/f'{path.stem}_preview.json').read_text());checks={}
 checks['current_build_and_preview_glb_hash']=build['sha256']==pre['actual_glb_sha256']==digest(path)
 checks['embedded_basecolor_is_declared_atlas']=images[0]['sha256']==digest(ROOT/rec['atlas'])
 checks['embedded_basecolor_1024']=images[0]['dimensions']==[1024,1024]
 checks['runtime_at_most_three_primitives_and_three_materials']=len(doc['meshes'])==1 and 1<=len(doc['meshes'][0]['primitives'])<=3 and len(doc['materials'])==3
 checks['all_basecolor_materials_bound']=all(m['pbrMetallicRoughness']['baseColorTexture']['index']==0 for m in doc['materials'])
 checks['no_external_image_uri']=all('uri' not in im for im in doc['images'])
 checks['preview_size']=Image.open(ROOT/'previews'/f'{path.stem}.png').size==(640,720)
 style=rec['style_direction'];is_pbr=style=='endfield_pbr_anime'
 checks['expected_image_count']=len(images)==(2 if is_pbr else 1)
 if is_pbr:
  checks['embedded_metallicroughness_map_is_declared_orm']=images[1]['sha256']==digest(ROOT/'atlases/endfield_pbr_orm_runtime1024.png')
  checks['metallicroughness_map_bound_all_materials']=all(m['pbrMetallicRoughness']['metallicRoughnessTexture']['index']==1 for m in doc['materials'])
  checks['orm_dimensions_1024']=images[1]['dimensions']==[1024,1024]
 editable=ROOT/'models'/f'{path.stem}_editable_parts.glb';ed,ea,ei=parse(editable);parts=rec['compiled_parts']
 checks['editable_part_count']=len(ed['nodes'])==len(parts)==len(ed['meshes'])
 checks['editable_embedded_images_match_runtime']=ei==images
 pos_error=0.;uv_error=0.;normal_error=0.;material_same=True;etri=0
 for node,part in zip(ed['nodes'],parts):
  assert not any(k in node for k in ['rotation','matrix','scale'])
  primitive=ed['meshes'][node['mesh']]['primitives'][0];ix=ea(primitive['indices']).ravel();attrs=primitive['attributes'];p=ea(attrs['POSITION'])[ix]+np.array(node['translation'],dtype=np.float32);p=np.column_stack((p[:,0],-p[:,2],p[:,1])).reshape(-1,3,3);n=ea(attrs['NORMAL'])[ix];n=np.column_stack((n[:,0],-n[:,2],n[:,1])).reshape(-1,3,3);uv=ea(attrs['TEXCOORD_0'])[ix].reshape(-1,3,2)
  start,count=part['triangle_start'],part['triangle_count'];sl=slice(start,start+count);etri+=len(p)
  pos_error=max(pos_error,float(np.abs(p-z['position'][sl]).max()));normal_error=max(normal_error,float(np.abs(n-z['normal'][sl]).max()));uv_error=max(uv_error,float(np.abs(uv-z['uv'][sl]).max()));material_same=material_same and bool(np.all(z['material'][sl]==primitive['material']))
 checks['editable_worldspace_positions_match_runtime_source']=pos_error<1e-6
 checks['editable_normals_uvs_match_runtime_source']=normal_error<1e-6 and uv_error<1e-6
 checks['editable_material_partition_match']=material_same
 checks['editable_triangle_count_matches']=etri==len(z['position'])
 checks['editable_hash_matches_export_record']=digest(editable)==json.loads((ROOT/'validation'/f'{path.stem}_editable_parts.json').read_text())['sha256']
 assert all(checks.values()),(path.name,checks)
 records.append({'file':str(path.relative_to(ROOT)),'glb_sha256':digest(path),'editable_glb_sha256':digest(editable),'preview_sha256':digest(ROOT/'previews'/f'{path.stem}.png'),'triangles':int(len(z['position'])),'separately_editable_nodes':len(ed['nodes']),'embedded_images':images,'editable_max_position_error':pos_error,'checks':checks,'normal_map_present':any('normalTexture' in m for m in doc['materials'])})
result={'verified_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'all_checks_pass':True,'runtime_models':len(records),'editable_models':len(records),'preview_files':len(records),'scope':'Independent serialized file/header/buffer check, embedded PNG and hash check, current preview-to-model provenance, editable node world-space geometry-to-NPZ match. Numeric GLB round-trip also performed separately. Not Blender/Unity import, glTF conformance certification, target NPR shader parity, mobile testing or art acceptance.','peak_rss_kib':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,'records':records}
(ROOT/'validation/final_delivery_verification_r2.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k!='records'},indent=2))
