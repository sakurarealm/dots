import zipfile,pathlib,json,struct,hashlib,math,resource
resource.setrlimit(resource.RLIMIT_AS,(95*1024*1024,95*1024*1024))
root=pathlib.Path(__file__).resolve().parent
p=next(root.glob('02*.zip'))
sha=lambda b:hashlib.sha256(b).hexdigest()
r={'subject':'02_蜗壳移动书库','library_file_id':'libfile_3ec0e9377dd88191bf9d6bfb06298ad3','zip_path':str(p),'zip_bytes':p.stat().st_size,'zip_sha256':sha(p.read_bytes()),'scope':'Recovery of existing six-direction candidates; no new production, engine test, model render, or mobile acceptance','models':[]}
with zipfile.ZipFile(p) as z:
 r['zip_member_count']=len(z.infolist());r['crc_bad_member']=z.testzip(); manifest=json.loads(z.read('模型清单.json'));r['package_readme']=z.read('请先阅读.txt').decode()
 for name in z.namelist():
  if not name.endswith('.glb'):continue
  b=z.read(name);magic,version,total=struct.unpack_from('<4sII',b);off=12;chunks=[];j=None;binary=None
  while off<len(b):
   n,t=struct.unpack_from('<II',b,off);off+=8; chunks.append({'type':t,'length':n})
   if t==0x4e4f534a:j=json.loads(b[off:off+n])
   if t==0x004e4942:binary=memoryview(b)[off:off+n]
   off+=n
  def values(ai):
   a=j['accessors'][ai];v=j['bufferViews'][a['bufferView']];num={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];fmt='<'+{5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]*num;size=struct.calcsize(fmt);stride=v.get('byteStride',size);start=v.get('byteOffset',0)+a.get('byteOffset',0)
   for ix in range(a['count']):yield struct.unpack_from(fmt,binary,start+ix*stride)
  prim=[]
  for mesh in j['meshes']:
   for q in mesh['primitives']:
    attrs=q['attributes'];pc=j['accessors'][attrs['POSITION']]['count'];ic=j['accessors'][q['indices']]['count'] if 'indices' in q else pc;uv=attrs.get('TEXCOORD_0');uvmin=[float('inf')]*2;uvmax=[-float('inf')]*2;uvfinite=True;uvoutside=0
    if uv is not None:
     for pair in values(uv):
      uvfinite &= all(map(math.isfinite,pair));uvoutside+=int(any(x<0 or x>1 for x in pair))
      for d,x in enumerate(pair):uvmin[d]=min(uvmin[d],x);uvmax[d]=max(uvmax[d],x)
    valididx=all(0<=v[0]<pc for v in values(q['indices'])) if 'indices'in q else True
    finite=all(math.isfinite(x) for ai in attrs.values() for row in values(ai) for x in row)
    prim.append({'vertices':pc,'indices':ic,'mode':q.get('mode',4),'triangles':ic//3 if q.get('mode',4)==4 else None,'index_bounds_valid':valididx,'attribute_values_finite':finite,'uv_count':j['accessors'][uv]['count'] if uv is not None else 0,'uv_min':uvmin,'uv_max':uvmax,'uv_values_finite':uvfinite,'uv_vertices_outside_0_1':uvoutside,'material_index':q.get('material')})
  images=[]
  for ix,img in enumerate(j.get('images',[])):
   v=j['bufferViews'][img['bufferView']];s=v.get('byteOffset',0);data=binary[s:s+v['byteLength']];dims=struct.unpack_from('>II',data,16) if bytes(data[:8])==b'\x89PNG\r\n\x1a\n' else None
   images.append({'index':ix,'mime':img.get('mimeType'),'bytes':len(data),'dimensions':dims,'sha256':sha(data)})
   if len(r['models'])==0 and ix==0:
    out=root/'snail-library-base-atlas.png';out.write_bytes(data);r['atlas_preview_path']=str(out)
  m=next(x for x in manifest if x['文件']==name)
  r['models'].append({'file':name,'bytes':len(b),'sha256':sha(b),'manifest_hash_match':sha(b)==m['SHA256'],'manifest_bytes_match':len(b)==m['字节数'],'glb_header_valid':magic==b'glTF' and version==2 and total==len(b) and off==len(b),'chunks':chunks,'mesh_count':len(j.get('meshes',[])),'node_count':len(j.get('nodes',[])),'primitives':prim,'triangles':sum(x['triangles'] or 0 for x in prim),'vertices':sum(x['vertices'] for x in prim),'materials':j.get('materials',[]),'images':images,'textures':j.get('textures',[]),'extensions_used':j.get('extensionsUsed',[]),'extras':j.get('extras',{}),'manifest_revision_claim':m})
  del data,binary,b
r['total_triangles']=sum(x['triangles'] for x in r['models']);r['unique_embedded_image_hashes']=len({i['sha256'] for m in r['models'] for i in m['images']});r['max_rss_kib']=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
r['limitations']=['End-cap revision counts are package claims, not independently verified against original GLBs.','No original-model binary comparison; geometry/UV/texture unchanged claim is not independently verified.','BK remains explicitly uncalibrated.','Standard glTF PBR materials do not implement dedicated cel/gouache/oil engine shaders.','Texture atlas visual inspection is not a model render and cannot establish visual quality or mobile readiness.','No Unity import, phone profiling, draw-call measurement, or mobile acceptance performed.']
(root/'snail-library-recovery-audit.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in r.items() if k not in ['models','package_readme']},ensure_ascii=False,indent=2))
for m in r['models']:print(m['file'],m['triangles'],m['vertices'],len(m['primitives']),len(m['materials']),m['images'])
