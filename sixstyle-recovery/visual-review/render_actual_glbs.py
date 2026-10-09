#!/usr/bin/env python3
"""CPU-only actual GLB rasterizer. No models modified. Hard address-space cap 256 MiB.
Run: OPENBLAS_NUM_THREADS=1 python render_actual_glbs.py
Orthographic, common world framing, embedded base colors, approximate Lambert lighting.
Not a glTF PBR reference renderer: no metallic/roughness response, shadows, cel shader or outlines.
"""
import os,resource
os.environ['OPENBLAS_NUM_THREADS']='1'
resource.setrlimit(resource.RLIMIT_AS,(256*1024*1024,256*1024*1024))
import io,json,struct,zipfile,pathlib,hashlib,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
OUT=pathlib.Path(__file__).resolve().parent
ZIP=next(OUT.parent.glob('01*.zip'))
S=256
NAMES=['01 Genshin / cel candidate','02 Endfield / PBR anime','03 Ghibli / gouache candidate','04 BK / uncalibrated','05 Hand-painted oil candidate','06 Bloomwalker / soft paint']

def load(blob):
 jn,typ=struct.unpack_from('<II',blob,12);j=json.loads(blob[20:20+jn]);off=20+jn;bn,typ=struct.unpack_from('<II',blob,off);buf=memoryview(blob)[off+8:off+8+bn]
 def acc(ai):
  a=j['accessors'][ai];v=j['bufferViews'][a['bufferView']];nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1',5122:'<i2',5120:'i1'}[a['componentType']]);stride=v.get('byteStride',dt.itemsize*nc)
  x=np.ndarray((a['count'],nc),dtype=dt,buffer=buf,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(stride,dt.itemsize)).copy()
  if a.get('normalized') and dt.kind in 'iu':x=np.maximum(-1,x.astype('f4')/np.iinfo(dt).max)
  if 'sparse' in a:raise ValueError('Sparse accessor unsupported')
  return x
 textures=[]
 for im in j.get('images',[]):
  v=j['bufferViews'][im['bufferView']];start=v.get('byteOffset',0);textures.append(np.asarray(Image.open(io.BytesIO(buf[start:start+v['byteLength']])).convert('RGBA')))
 def matrix(n):
  if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
  x,y,z,w=n.get('rotation',[0,0,0,1]);R=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
  M=np.eye(4);M[:3,:3]=R@np.diag(n.get('scale',[1,1,1]));M[:3,3]=n.get('translation',[0,0,0]);return M
 prim=[]
 def visit(ni,parent):
  n=j['nodes'][ni];M=parent@matrix(n)
  if 'mesh'in n:
   for p in j['meshes'][n['mesh']]['primitives']:
    if p.get('mode',4)!=4:raise ValueError('Non-triangle primitive')
    a=p['attributes'];pos=acc(a['POSITION']);pos=pos@M[:3,:3].T+M[:3,3];idx=acc(p['indices']).reshape(-1,3) if 'indices'in p else np.arange(len(pos)).reshape(-1,3)
    norm=acc(a['NORMAL'])@np.linalg.inv(M[:3,:3]) if 'NORMAL'in a else None
    if norm is not None:norm/=np.maximum(np.linalg.norm(norm,axis=1,keepdims=True),1e-12)
    uv=acc(a['TEXCOORD_0']) if 'TEXCOORD_0'in a else None
    mat=j.get('materials',[{}])[p.get('material',0)];pbr=mat.get('pbrMetallicRoughness',{});tex=None;sampler={}
    if 'baseColorTexture'in pbr:
     t=j['textures'][pbr['baseColorTexture']['index']];tex=textures[t['source']];sampler=j.get('samplers',[{}])[t.get('sampler',0)] if j.get('samplers') else {}
    prim.append(dict(pos=pos,idx=idx,norm=norm,uv=uv,tex=tex,factor=np.array(pbr.get('baseColorFactor',[1,1,1,1]),dtype='f8'),mat=mat,sampler=sampler))
  for child in n.get('children',[]):visit(child,M)
 for ni in j['scenes'][j.get('scene',0)]['nodes']:visit(ni,np.eye(4))
 allpos=np.concatenate([p['pos'] for p in prim]);return prim,dict(nodes=j['nodes'],bounds_min=allpos.min(0).tolist(),bounds_max=allpos.max(0).tolist(),triangles=sum(len(p['idx'])for p in prim),materials=j.get('materials',[]),accessors=j['accessors'])

def srgb2lin(x):return np.where(x<=.04045,x/12.92,((x+.055)/1.055)**2.4)
def lin2srgb(x):return np.where(x<=.0031308,12.92*x,1.055*np.maximum(x,0)**(1/2.4)-.055)
def render(prims,az,el):
 az,el=np.deg2rad([az,el]);cam=np.array([math.sin(az)*math.cos(el),math.sin(el),math.cos(az)*math.cos(el)]);right=np.array([math.cos(az),0,-math.sin(az)]);up=np.cross(cam,right)
 # Same target, scale and camera for all six GLBs. Original positions and transforms preserved.
 target=np.array([0,1.15,0]);scale=87.;depth=np.full((S,S),-np.inf,dtype='f4');rgb=np.empty((S,S,3),dtype='u1');rgb[:]=[231,235,238];mask=np.zeros((S,S),dtype='u1')
 light=np.array([-.5,.8,.7]);light/=np.linalg.norm(light)
 for p in prims:
  v=p['pos']-target;proj=np.column_stack((128+v@right*scale,128-v@up*scale,v@cam))
  for ids in p['idx']:
   q=proj[ids];x0=max(0,int(np.floor(q[:,0].min())));x1=min(S-1,int(np.ceil(q[:,0].max())));y0=max(0,int(np.floor(q[:,1].min())));y1=min(S-1,int(np.ceil(q[:,1].max())))
   if x0>x1 or y0>y1:continue
   a,b,c=q;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
   if abs(den)<1e-10:continue
   yy,xx=np.mgrid[y0:y1+1,x0:x1+1];xx=xx+.5;yy=yy+.5
   w0=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den;w1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;w2=1-w0-w1;zz=w0*a[2]+w1*b[2]+w2*c[2]
   ok=(w0>=-1e-6)&(w1>=-1e-6)&(w2>=-1e-6)&(zz>depth[y0:y1+1,x0:x1+1])
   if not ok.any():continue
   iy,ix=np.where(ok);w=np.column_stack((w0[ok],w1[ok],w2[ok]));factor=p['factor'];col=np.tile(factor[:3],(len(w),1));alpha=np.full(len(w),factor[3])
   if p['tex'] is not None and p['uv'] is not None:
    uv=w@p['uv'][ids];tex=p['tex'];h,tw=tex.shape[:2]
    for k,key in enumerate(['wrapS','wrapT']):
     wrap=p['sampler'].get(key,10497)
     if wrap==33071:uv[:,k]=np.clip(uv[:,k],0,1)
     elif wrap==33648:uv[:,k]=1-abs((uv[:,k]%2)-1)
     else:uv[:,k]%=1
    tx=np.clip((uv[:,0]*tw).astype(int),0,tw-1);ty=np.clip((uv[:,1]*h).astype(int),0,h-1);sample=tex[ty,tx]/255.;col*=srgb2lin(sample[:,:3]);alpha*=sample[:,3]
   if p['mat'].get('alphaMode','OPAQUE')=='MASK':
    keep=alpha>=p['mat'].get('alphaCutoff',.5);iy=iy[keep];ix=ix[keep];w=w[keep];col=col[keep]
   if not len(w):continue
   if p['norm'] is not None:n=w@p['norm'][ids]
   else:
    face=np.cross(p['pos'][ids[1]]-p['pos'][ids[0]],p['pos'][ids[2]]-p['pos'][ids[0]]);n=np.tile(face,(len(w),1))
   n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-12)
   if p['mat'].get('doubleSided',False):n=np.where((n@cam<0)[:,None],-n,n)
   illumination=.48+.52*np.maximum(0,n@light);out=np.clip(lin2srgb(col*illumination[:,None])*255,0,255).astype('u1');Y=iy+y0;X=ix+x0;rgb[Y,X]=out;depth[Y,X]=zz[iy,ix];mask[Y,X]=255
 return Image.fromarray(rgb),Image.fromarray(np.where(mask[:,:,None]>0,np.array([30,39,49],dtype='u1'),np.array([246,246,242],dtype='u1')).astype('u1'))

def sheet(images,title,sub,name):
 canvas=Image.new('RGB',(S*3,80+(S+40)*2),(248,248,245));d=ImageDraw.Draw(canvas);d.text((12,12),title,fill=(20,25,30));d.text((12,32),sub,fill=(50,55,60));d.text((12,51),'Actual GLBs | identical camera and world scale | no geometry edits',fill=(50,55,60))
 for i,img in enumerate(images):
  x=(i%3)*S;y=80+(i//3)*(S+40);canvas.paste(img,(x,y));d.text((x+8,y+S+7),NAMES[i],fill=(20,25,30))
 canvas.save(OUT/name)

records=[]
views={'three_quarter':(35,15),'front_plus_z':(0,0),'side_plus_x':(90,0)}
imgs={v:[]for v in views};sils={v:[]for v in views}
with zipfile.ZipFile(ZIP) as archive:
 for name in sorted(n for n in archive.namelist() if n.endswith('.glb')):
  blob=archive.read(name);prims,record=load(blob);record.update(file=name,sha256=hashlib.sha256(blob).hexdigest());records.append(record);i=len(records)
  for view,(az,el) in views.items():
   color,sil=render(prims,az,el);imgs[view].append(color);sils[view].append(sil);color.save(OUT/f'{i:02d}_{view}.png');sil.save(OUT/f'{i:02d}_{view}_silhouette.png')
  print(name,record['triangles'],flush=True)
  del prims,blob
for view in views:
 sheet(imgs[view],f'Rain tower / {view} / embedded base-color texture','Approximate diffuse light. NOT a PBR, cel, or game-engine render.',f'comparison_{view}.png')
 sheet(sils[view],f'Rain tower / {view} / geometry-only silhouette','Texture and lighting removed; same camera and scale.',f'silhouette_{view}.png')
report={'zip':ZIP.name,'zip_sha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),'mapping':NAMES,'view_definition':views,'camera_target':[0,1.15,0],'pixels_per_world_unit':87,'model_tile_resolution':[256,256],'max_address_space_bytes':256*1024*1024,'max_rss_kib':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,'models':records,'limitations':['CPU approximate diffuse lighting, not full glTF PBR; metallic/roughness textures not rendered.','No custom style shader, outline, shadow, AO, transparency blending, animation, engine or mobile validation.','Nearest-neighbor base-color sampling; no antialiasing at 256px tile resolution.','Front +Z and side +X are declared camera conventions, not authored front metadata.','Camera, framing, lighting and original transforms are consistent across all models.']}
(OUT/'render_audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('max_rss_kib',report['max_rss_kib'])
