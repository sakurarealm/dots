import zipfile,struct,json,hashlib,zlib,math,resource,os,datetime
resource.setrlimit(resource.RLIMIT_AS,(100*1024*1024,100*1024*1024))
p='library-loom-grindstone-20261008/Aether_Loom_Grindstone_Mobile_Art_20261008.zip'
out={'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archive':os.path.abspath(p),'scope':'Actual GLB bytes, accessor payloads, embedded textures and one pre-existing preview; no engine/mobile test or full catalogue coverage','assets':[]}
st=os.stat(p)
with zipfile.ZipFile(p) as z:
 for name in z.namelist():
  if not name.endswith('.glb'):continue
  raw=z.read(name); magic,ver,total=struct.unpack_from('<4sII',raw); assert magic==b'glTF' and ver==2 and total==len(raw)
  chunks={};off=12
  while off<len(raw):
   n,t=struct.unpack_from('<II',raw,off);chunks[t]=raw[off+8:off+8+n];off+=8+n
  assert off==len(raw)
  j=json.loads(chunks[0x4e4f534a]);binary=chunks[0x004e4942]
  assert len(j['buffers'])==1 and j['buffers'][0]['byteLength']<=len(binary)
  for v in j['bufferViews']:assert v['buffer']==0 and v.get('byteOffset',0)+v['byteLength']<=j['buffers'][0]['byteLength']
  def accessor(i):
   a=j['accessors'][i];assert 'sparse' not in a
   v=j['bufferViews'][a['bufferView']];fmt={5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];size=struct.calcsize('<'+fmt*n);stride=v.get('byteStride',size);start=v.get('byteOffset',0)+a.get('byteOffset',0)
   assert a.get('byteOffset',0)+(a['count']-1)*stride+size<=v['byteLength']
   data=[struct.unpack_from('<'+fmt*n,binary,start+k*stride) for k in range(a['count'])]
   assert all(math.isfinite(x) for row in data for x in row)
   return data
  # Decode every accessor, rather than trust counts alone.
  for i in range(len(j['accessors'])):accessor(i)
  primitives=[]
  for mesh in j['meshes']:
   for pr in mesh['primitives']:
    assert pr.get('mode',4)==4
    pos=accessor(pr['attributes']['POSITION']);uv=accessor(pr['attributes']['TEXCOORD_0']);idx=[x[0] for x in accessor(pr['indices'])]
    assert len(idx)%3==0 and all(0<=i<len(pos) for i in idx) and len(uv)==len(pos)
    deg_uv=0;deg_geom=0
    for a,b,c in zip(idx[::3],idx[1::3],idx[2::3]):
     u,v,w=uv[a],uv[b],uv[c];deg_uv+=abs((v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]))<=1e-12
     u,v,w=pos[a],pos[b],pos[c];d=[v[k]-u[k] for k in range(3)];e=[w[k]-u[k] for k in range(3)];cross=[d[1]*e[2]-d[2]*e[1],d[2]*e[0]-d[0]*e[2],d[0]*e[1]-d[1]*e[0]];deg_geom+=sum(x*x for x in cross)<=1e-24
    primitives.append({'mesh':mesh['name'],'material_index':pr['material'],'triangles':len(idx)//3,'vertices':len(pos),'uv_sets':[k for k in pr['attributes'] if k.startswith('TEXCOORD_')],'uv_range':[[min(v[k] for v in uv),max(v[k] for v in uv)] for k in range(2)],'degenerate_uv_triangles_epsilon_1e_12':deg_uv,'degenerate_geometric_triangles_squared_cross_epsilon_1e_24':deg_geom})
  images=[]
  for im in j['images']:
   v=j['bufferViews'][im['bufferView']];b=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];assert b.startswith(b'\x89PNG\r\n\x1a\n');w,h=struct.unpack_from('>II',b,16)
   pn='Aether_Loom_Grindstone/textures/'+im['name']+'.png';external=z.read(pn);assert b==external
   images.append({'name':im['name'],'embedded_bytes':len(b),'png_dimensions':[w,h],'sha256':hashlib.sha256(b).hexdigest(),'packaged_texture':pn,'matches_packaged_texture':True,'packaged_texture_crc_verified':True})
  for tex in j['textures']:assert 0<=tex['source']<len(images)
  mats=[]
  for m in j['materials']:
   for k,val in m.get('pbrMetallicRoughness',{}).items():
    if k.endswith('Texture'):assert 0<=val['index']<len(j['textures'])
   mats.append({'name':m['name'],'alpha_mode':m.get('alphaMode','OPAQUE'),'base_color_alpha':m.get('pbrMetallicRoughness',{}).get('baseColorFactor',[1,1,1,1])[3],'double_sided':m.get('doubleSided',False)})
  manifest=json.loads(z.read(name.rsplit('/',1)[0]+'/manifest.json'));sha=hashlib.sha256(raw).hexdigest();expected=next(f['sha256'] for f in manifest['files'] if f['file']==name.rsplit('/',1)[1]);tris=sum(x['triangles'] for x in primitives)
  out['assets'].append({'archive_entry':name,'classification':'standalone art candidate, not approved project reference','bytes':len(raw),'crc32':format(zlib.crc32(raw)&0xffffffff,'08x'),'zip_crc_verified':zlib.crc32(raw)&0xffffffff==z.getinfo(name).CRC,'sha256':sha,'manifest_sha256_matches':sha==expected,'triangle_count':tris,'manifest_triangle_count_matches':tris==manifest['triangles'],'manifest_budget':manifest['budget_target_triangles'],'triangles_above_authored_budget':max(0,tris-manifest['budget_target_triangles']),'mesh_count':len(j['meshes']),'primitive_count':len(primitives),'accessors_decoded_finite_and_in_bounds':len(j['accessors']),'materials':mats,'images':images,'primitives':primitives})
 name='Aether_Loom_Grindstone/loom/final/loom_contact_512.png';info=z.getinfo(name);assert info.file_size<5*1024*1024
 preview='block-recovery/recovered_loom_contact_512.png';open(preview,'wb').write(z.read(name));out['preview']={'archive_entry':name,'local_path':os.path.abspath(preview),'bytes':info.file_size,'zip_crc_verified':True,'visual_inspection':'pending'}
 out['readme_scope']={'candidates':['loom','grindstone'],'image_only_style_reference':'reference/approved_workbench_perspective.png','project_import_mobile_performance':'not tested','shared_basecolors_recovered':3}
out['archive_stat_unchanged']=st.st_mtime_ns==os.stat(p).st_mtime_ns and st.st_size==os.stat(p).st_size
out['process_peak_rss_kib']=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
open('block-recovery/recovered_glb_payload_audit_20261009.json','w').write(json.dumps(out,indent=2)+'\n')
for a in out['assets']:print(a['archive_entry'],a['triangle_count'],'triangles;',a['mesh_count'],'meshes;',a['primitive_count'],'primitives;',len(a['images']),'embedded images; UV degenerate=',sum(x['degenerate_uv_triangles_epsilon_1e_12'] for x in a['primitives']),'geometry degenerate=',sum(x['degenerate_geometric_triangles_squared_cross_epsilon_1e_24'] for x in a['primitives']))
print('peakRSS KiB',out['process_peak_rss_kib'])
