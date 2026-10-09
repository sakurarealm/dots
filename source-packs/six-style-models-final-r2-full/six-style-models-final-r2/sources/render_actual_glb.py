"""Low-RAM previews rasterize the serialized GLB, using its real embedded atlas.
These are CPU 3D art previews, not Blender/Unity/runtime screenshots.
"""
from pathlib import Path
from io import BytesIO
import sys,json,struct,math,resource,time,gc
import numpy as np
from PIL import Image
import geometry_raster_core as G
ROOT=Path(__file__).resolve().parents[1];F=np.float32
def read_glb(path):
    raw=path.read_bytes();magic,version,total=struct.unpack_from('<4sII',raw,0);assert magic==b'glTF' and version==2 and total==len(raw)
    size,typ=struct.unpack_from('<I4s',raw,12);assert typ==b'JSON';j=json.loads(raw[20:20+size]);off=20+size;bs,bt=struct.unpack_from('<I4s',raw,off);assert bt==b'BIN\0';blob=raw[off+8:off+8+bs]
    def acc(i):
        a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];cols={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']];dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']]
        return np.frombuffer(blob,dtype=dtype,count=a['count']*cols,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,cols)
    ps=[];ns=[];uv=[];ms=[]
    for p in j['meshes'][0]['primitives']:
        ids=acc(p['indices']).ravel().astype(int);pos=acc(p['attributes']['POSITION'])[ids];norm=acc(p['attributes']['NORMAL'])[ids];tex=acc(p['attributes']['TEXCOORD_0'])[ids]
        pos=np.column_stack((pos[:,0],-pos[:,2],pos[:,1])).reshape(-1,3,3);norm=np.column_stack((norm[:,0],-norm[:,2],norm[:,1])).reshape(-1,3,3)
        ps.append(pos);ns.append(norm);uv.append(tex.reshape(-1,3,2));ms.extend([p['material']]*len(pos))
    a={'position':np.concatenate(ps).astype(F),'normal':np.concatenate(ns).astype(F),'uv':np.concatenate(uv).astype(F),'material':np.array(ms,dtype=np.uint8)};a['character_cloth']=np.zeros(len(ms),dtype=np.uint8)
    im=j['images'][0];v=j['bufferViews'][im['bufferView']];png=blob[v['byteOffset']:v['byteOffset']+v['byteLength']];atlas=Image.open(BytesIO(png)).convert('RGB')
    orm=None
    if len(j['images'])>1:
        v=j['bufferViews'][j['images'][1]['bufferView']];orm=Image.open(BytesIO(blob[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGB')
    assert np.isfinite(a['position']).all() and np.isfinite(a['normal']).all();assert np.allclose(np.linalg.norm(a['normal'],axis=2),1,atol=.002);return a,atlas,j,orm
def atlas_levels(im):
    a=G.srgb_to_linear(np.asarray(im,dtype=F)/255);levels=[a]
    for level in range(1,8):
        s=im.width//(2**level);levels.append(np.stack([np.asarray(Image.fromarray(a[:,:,c]).resize((s,s),Image.Resampling.BOX),dtype=F) for c in range(3)],axis=2))
    return levels
def soft_shadow(P,N,sm,radius=4):
    q=P-sm['target'];scale=sm['size']/sm['width'];x=q@sm['right']*scale+sm['size']/2;y=-q@sm['up']*scale+sm['size']/2;z=q@sm['forward'];out=np.zeros(len(P),dtype=F);weight=0.
    for dx in range(-radius,radius+1,2):
        for dy in range(-radius,radius+1,2):
            w=math.exp(-(dx*dx+dy*dy)/max(1,radius*radius));xx=np.clip(np.rint(x+dx).astype(int),0,sm['size']-1);yy=np.clip(np.rint(y+dy).astype(int),0,sm['size']-1);bias=.017+.016*(1-abs(N@sm['forward']));out+=(z+bias>=sm['depth'][yy,xx])*w;weight+=w
    return out/weight
def run(style,name,w=640,h=720):
    start=time.time();path=ROOT/'models'/f'{style}_{name}.glb';mesh,atlas,doc,orm=read_glb(path);actual_triangles=len(mesh['position']);P=mesh['position'].reshape(-1,3);mn=P.min(axis=0);mx=P.max(axis=0)
    view=G.unit([6,-8,4.05]);right=G.unit(np.cross([0,0,1],view));up=np.cross(view,right);center=(mn+mx)/2;q=P-center;xs=q@right;ys=q@up;center+=right*((xs.min()+xs.max())/2)+up*((ys.min()+ys.max())/2);width=max(float(xs.max()-xs.min())+.25,(float(ys.max()-ys.min())+.25)*w/h)
    eye=center+view*12;original=G.project
    # Preview-only neutral studio ground is genuine geometry and not part of GLB export.
    floor_z=float(mn[2])-.014;floor=np.array([[[-5,-5,floor_z],[5,-5,floor_z],[5,5,floor_z]],[[-5,-5,floor_z],[5,5,floor_z],[-5,5,floor_z]]],dtype=F)
    stage={k:v.copy() for k,v in mesh.items()};stage['position']=np.concatenate((stage['position'],floor));stage['normal']=np.concatenate((stage['normal'],np.tile(np.array([0,0,1],dtype=F),(2,3,1))));stage['uv']=np.concatenate((stage['uv'],np.zeros((2,3,2),dtype=F)));stage['material']=np.r_[stage['material'],np.array([3,3],dtype=np.uint8)];stage['character_cloth']=np.r_[stage['character_cloth'],np.zeros(2,dtype=np.uint8)]
    G.project=lambda pos,ignored_eye,ignored_target,ww,hh,ignored_width:original(pos,eye,center,ww,hh,width)
    g=G.gbuffer(stage,w,h);G.project=original;sm=G.shadow_map(stage);levels=atlas_levels(atlas);orm_data=np.asarray(orm,dtype=F)/255 if orm is not None else None;del stage,atlas,orm;gc.collect()
    image=np.full((h,w,3),.22,dtype=F);L=sm['forward'];V=g['view'];Fill=G.unit([4,-1,5]);Rim=G.unit([2,4,6]);key=np.array([1.,.93,.80],dtype=F);sky=np.array([.81,.90,1.],dtype=F)
    for mid in [0,1,2,3]:
        yy,xx=np.where(g['M']==mid)
        for first in range(0,len(xx),8192):
            y,x=yy[first:first+8192],xx[first:first+8192];N=g['N'][y,x];Pp=g['P'][y,x];uv=g['UV'][y,x].copy();uv[:,1]=1-uv[:,1];lod=np.minimum(g['LOD'][y,x]+1,7)
            A=np.full((len(x),3),.22,dtype=F) if mid==3 else G.mip_sample(levels,uv,lod);sh=soft_shadow(Pp,N,sm,1 if style=='genshin_cel' else 4);nl=np.maximum(N@L,0);nf=np.maximum(N@Fill,0);nr=np.maximum(N@Rim,0)
            diffuse=.45+nl*sh*.47+nf*.16+nr*.08;light_color=(.45+nl[:,None]*sh[:,None]*key*.47+nf[:,None]*sky*.16+nr[:,None]*key*.08)/np.maximum(diffuse[:,None],.01)
            if mid==3:col=A*(.74+sh[:,None]*.22);image[y,x]=col;continue
            props=doc['materials'][mid]['pbrMetallicRoughness'];rough=np.full(len(x),props.get('roughnessFactor',1),dtype=F);metal=props.get('metallicFactor',0)
            if orm_data is not None:
                sampled=G.sample(orm_data,uv);rough=sampled[:,1];metal=sampled[:,2,None]
            physical=A*.30+G.ggx(A,N,L,V,rough,metal,key*1.5)*sh[:,None]+G.ggx(A,N,Fill,V,rough,metal,sky*.78)+G.ggx(A,N,Rim,V,rough,metal,key*.40)
            if style=='endfield_pbr_anime':
                reflection=2*N*(N@V)[:,None]-V;t=np.clip((reflection[:,2]+.2)*2,0,1)[:,None];environment=t*np.array([.80,.87,.94],dtype=F)+(1-t)*np.array([.22,.20,.17],dtype=F);met=np.asarray(metal,dtype=F)
                if met.ndim==0:met=np.full((len(x),1),met,dtype=F)
                physical+=A*met*environment*(.20+.22*(1-rough))[:,None]
            if style=='genshin_cel':
                c=G.palette(diffuse,[0,.69,.91],[[.54,.62,.75],[.84,.87,.94],[1.10,1.08,1.03]],True);col=A*c*light_color
                if mid==1:col+=(np.maximum(N@G.unit(L+V),0)>.93)[:,None]*sh[:,None]*.19
            elif style=='endfield_pbr_anime':col=physical
            elif style=='ghibli_poster':
                c=G.palette(diffuse,[0,.78],[[.61,.69,.75],[1.06,1.05,.98]],True);col=A*c*light_color
            elif style=='bk_project_candidate':
                c=G.palette(diffuse,[0,.64,.74,1.1],[[.58,.64,.73],[.63,.68,.74],[.97,.99,.95],[1.08,1.08,1.02]]);col=A*c*light_color
            elif style=='bloomwalker_painterly':col=A*diffuse[:,None]*light_color*.28+physical*.72
            else:
                # Approved oil look: actual broad bristle albedo, with restrained geometry light.
                col=A*diffuse[:,None]*light_color
                if mid==1:col=col*.55+physical*.45
            image[y,x]=col
    if style=='ghibli_poster':
        # Geometry-derived pigment contour, not a texture/noise filter or wireframe.
        ink=np.zeros((h,w),dtype=bool);dep=g['depth'];norm=g['N'];obj=g['M']!=3
        for dy,dx in [(0,1),(1,0)]:
            shifted=np.roll(dep,(dy,dx),(0,1));sn=np.roll(norm,(dy,dx),(0,1));diff=np.abs(dep-shifted);angle=np.sum(norm*sn,axis=2);edge=((diff>.065)|(angle<.70))&obj
            if dy:edge[0,:]=False
            if dx:edge[:,0]=False
            ink|=edge
        image[ink]=image[ink]*.62+np.array([.025,.023,.021],dtype=F)*.38
    im=Image.fromarray(np.clip(G.linear_to_srgb(np.clip(image,0,1))*255,0,255).astype(np.uint8));out=ROOT/'previews'/f'{style}_{name}.png';im.save(out)
    rss=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss;report={'file':out.name,'actual_glb':path.name,'actual_glb_sha256':__import__('hashlib').sha256(path.read_bytes()).hexdigest(),'actual_triangle_count_read_from_glb':actual_triangles,'embedded_atlas':doc['extras']['source_texture'],'uv_origin':'glTF top-left; CPU lookup explicitly converts helper convention','dimensions':[w,h],'camera_direction':[6,-8,4.05],'camera_center':center.tolist(),'camera_ortho_width':width,'lights':'warm key, cool sky proxy, restrained rim; true geometry depth-map soft shadows','texture_strategy':'approved or premium image-generated broad material swatches, large semantic UV islands; no sine/noise replacement texture','software_cpu_preview':True,'NOT_Blender_or_Unity_validation':True,'rss_peak_kib':rss,'duration_seconds':round(time.time()-start,2),'triangle_budget_pass':actual_triangles<=6000}
    (ROOT/'validation'/f'{style}_{name}_preview.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if __name__=='__main__':run(sys.argv[1],sys.argv[2],int(sys.argv[3]) if len(sys.argv)>3 else 640,int(sys.argv[4]) if len(sys.argv)>4 else 720)
