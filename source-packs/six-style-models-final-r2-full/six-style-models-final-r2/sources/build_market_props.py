"""Rich, editable market props grounded in the approved oil flower-stall atlas.
Original actual GLB geometry and per-part recipes. No Blender/Codex invocation.
"""
from pathlib import Path
import sys,json,math,struct,hashlib,resource
from PIL import Image
import numpy as np
import geometry_raster_core as G
ROOT=Path(__file__).resolve().parents[1]
for p in ['models','recipes','validation','previews']: (ROOT/p).mkdir(exist_ok=True)
F=np.float32
ROLES={'wood_dark':4,'wood_medium':5,'wood_honey':18,'cream':2,'cloth_coral':21,'cloth_blue':3,'teal':0,'sage':1,'pink':9,'leaf_dark':10,'leaf_light':11,'violet':15,'bread_crust':6,'bread_cut':19,'brass':24,'metal_dark':31}
ATLAS={'oil_handpaint':'oil_approved_atlas.png','genshin_cel':'genshin_cel_atlas_runtime1024.png','endfield_pbr_anime':'endfield_pbr_atlas_runtime1024.png','ghibli_poster':'ghibli_poster_atlas_r3_runtime1024.png','bloomwalker_painterly':'bloomwalker_painterly_atlas_r3_runtime1024.png','bk_project_candidate':'bk_project_candidate_atlas_runtime1024.png'}
REC=[];CURRENT_STYLE='';PARTS=[]
def add(o,name,role,surface='paint'):
    o.name=name;o.kind=surface;o.role=role;PARTS.append(o);return o
def box(name,p,size,role='wood_medium',surface='paint',bevel=.012,rot=(0,0,0)):
    REC.append({'name':name,'shape':'box','position':list(p),'size':list(size),'color_role':role,'surface':surface,'bevel':bevel,'rotation':list(rot)})
    return add(G.cube(name,p,size,'wood',bevel,rot),name,role,surface)
def ellipsoid(name,p,size,role='bread_crust',surface='paint',seg=12,rings=6,rot=(0,0,0)):
    REC.append({'name':name,'shape':'ellipsoid','position':list(p),'radii':list(size),'color_role':role,'surface':surface,'segments':seg,'rings':rings,'rotation':list(rot)})
    ps=[];ns=[];ts=[];size=np.asarray(size,dtype=F)
    for j in range(rings+1):
        b=math.pi*j/rings
        for i in range(seg):
            a=i*2*math.pi/seg;v=np.array([math.sin(b)*math.cos(a),math.sin(b)*math.sin(a),math.cos(b)],dtype=F);ps.append(v*size);ns.append(G.unit(v/size))
    for j in range(rings):
        for i in range(seg):
            a=j*seg+i;b=j*seg+(i+1)%seg;c=(j+1)*seg+(i+1)%seg;d=(j+1)*seg+i;ts.extend([(a,c,b),(a,d,c)])
    return add(G.Ob(ps,ts,ns,p,rot),name,role,surface)
def cylinder(name,p,r,h,role='wood_dark',surface='paint',seg=12,rot=(0,0,0),r2=None):
    REC.append({'name':name,'shape':'cylinder','position':list(p),'radius':r,'height':h,'radius_top':r if r2 is None else r2,'segments':seg,'rotation':list(rot),'color_role':role,'surface':surface})
    ps=[];ns=[];ts=[];r2=r if r2 is None else r2
    for k,z in enumerate([-h/2,h/2]):
        rr=r if k==0 else r2
        for i in range(seg):
            a=i*2*math.pi/seg;ps.append((rr*math.cos(a),rr*math.sin(a),z));ns.append(G.unit((math.cos(a),math.sin(a),(r-r2)/max(h,.001))))
    for i in range(seg):a=i;b=(i+1)%seg;ts.extend([(a,b,b+seg),(a,b+seg,a+seg)])
    ps.extend([(0,0,-h/2),(0,0,h/2)]);ns.extend([(0,0,-1),(0,0,1)])
    for i in range(seg):ts.extend([(2*seg,(i+1)%seg,i),(2*seg+1,seg+i,seg+(i+1)%seg)])
    return add(G.Ob(ps,ts,ns,p,rot),name,role,surface)
def beam(name,a,b,width,role='wood_dark',surface='paint',depth=None,bevel=0):
    a,b=np.asarray(a,dtype=F),np.asarray(b,dtype=F);z=G.unit(b-a);x=G.unit(np.cross((0,1,0) if abs(z[1])<.9 else (1,0,0),z));y=np.cross(z,x)
    o=box(name,(a+b)/2,(width,depth or width,float(np.linalg.norm(b-a))),role,surface,bevel);o.rot=np.column_stack((x,y,z));REC[-1]['shape']='beam';REC[-1]['a']=a.tolist();REC[-1]['b']=b.tolist();REC[-1]['width']=width;return o
def poly(name,ps,fs,role='cloth_coral',surface='paint',smooth=False):
    REC.append({'name':name,'shape':'mesh','vertices':[list(p) for p in ps],'faces':[list(f) for f in fs],'color_role':role,'surface':surface,'smooth':smooth})
    return add(G.mesh(name,ps,fs,'wood',smooth),name,role,surface)
def lathe(name,p,profile,role='teal',surface='paint',seg=16):
    REC.append({'name':name,'shape':'lathe','position':list(p),'profile':[list(q) for q in profile],'segments':seg,'color_role':role,'surface':surface})
    ps=[];ts=[]
    for r,z in profile:
        for i in range(seg):a=i*2*math.pi/seg;ps.append((r*math.cos(a),r*math.sin(a),z))
    for j in range(len(profile)-1):
        for i in range(seg):a=j*seg+i;b=j*seg+(i+1)%seg;c=(j+1)*seg+(i+1)%seg;d=(j+1)*seg+i;ts.extend([(a,b,c),(a,c,d)])
    ts.extend([(0,i+1,i) for i in range(1,seg-1)]);last=(len(profile)-1)*seg;ts.extend([(last,last+i,last+i+1) for i in range(1,seg-1)])
    ps=np.asarray(ps,dtype=F);n=np.zeros_like(ps)
    for t in ts:v=ps[list(t)];n[list(t)]+=np.cross(v[1]-v[0],v[2]-v[0])
    return add(G.Ob(ps,ts,G.unit(n),p),name,role,surface)
def leaf(name,p,angle,size=.19,role='leaf_dark'):
    p=np.asarray(p,dtype=F);u=np.array([math.cos(angle),math.sin(angle),.18],dtype=F);v=np.array([-u[1],u[0],0],dtype=F)
    return poly(name,[p,p+u*size+v*size*.38,p+u*size*2,p+u*size-v*size*.38,p+u*size+np.array([0,0,size*.18])],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],role,'leaf')
def blossom(name,p,size=.095,role='pink'):
    for i in range(5):
        a=i*math.pi*2/5;ellipsoid(name+' petal',np.asarray(p)+np.array([math.cos(a)*size*.53,math.sin(a)*size*.53,.012]),(size*.52,size*.34,size*.25),role,seg=8,rings=4,rot=(0,0,a))
    ellipsoid(name+' pollen',np.asarray(p)+[0,0,.036],(size*.26,size*.26,size*.20),'brass',seg=8,rings=4)
def pot(name,p,r=.20,h=.29,role='teal'):
    return lathe(name,p,[(r*.65,0),(r*.80,.04),(r*.94,h*.78),(r,h*.91),(r,h),(r*.86,h),(r*.82,h*.86)],role,seg=12)
def torus(name,p,R,r,role='brass',surface='metal',rot=(0,0,0),seg=16,minor=5):
    ps=[];ns=[];ts=[]
    for i in range(seg):
        a=i*2*math.pi/seg
        for j in range(minor):b=j*2*math.pi/minor;ps.append(((R+r*math.cos(b))*math.cos(a),(R+r*math.cos(b))*math.sin(a),r*math.sin(b)));ns.append((math.cos(b)*math.cos(a),math.cos(b)*math.sin(a),math.sin(b)))
    for i in range(seg):
        for j in range(minor):a=i*minor+j;b=((i+1)%seg)*minor+j;c=((i+1)%seg)*minor+(j+1)%minor;d=i*minor+(j+1)%minor;ts.extend([(a,b,c),(a,c,d)])
    REC.append({'name':name,'shape':'torus','position':list(p),'major_radius':R,'minor_radius':r,'segments':seg,'minor_segments':minor,'rotation':list(rot),'color_role':role,'surface':surface})
    return add(G.Ob(ps,ts,ns,p,rot),name,role,surface)

def bread_cart(style):
    pbr=style=='endfield_pbr_anime';cel=style=='genshin_cel';botanical=style=='bloomwalker_painterly'
    dark='metal_dark' if pbr else 'wood_dark';medium='cream' if pbr else 'wood_medium';surface='metal' if pbr else 'paint'
    box('Cart underframe',(0,.08,.42),(1.92,.95,.12),dark,surface,.015)
    box('Counter golden edge',(0,0,1.04),(2.13,1.12,.12),'brass' if pbr else 'wood_honey',surface,.025)
    box('Bread display counter',(0,-.03,1.10),(1.99,1.02,.045),'wood_honey','paint',.009)
    box('Deep storage back',(0,.44,.72),(1.80,.075,.56),medium,surface,.018)
    for x in [-.90,.90]:box('Cart side storage wall',(x,.04,.73),(.10,.86,.54),medium,surface,.020)
    box('Industrial painted front panel' if pbr else 'Front hand-painted apron',(0,-.473,.75),(1.80,.026,.46),'teal' if style=='bk_project_candidate' or pbr else 'cloth_blue','metal' if pbr else 'paint',0)
    for x in [-.87,.87]:box('Apron framing board',(x,-.498,.75),(.11,.06,.53),'wood_honey' if not pbr else 'brass',surface,.012,rot=(0,.05*x,0))
    for j in range(4):box('Interior storage floor board',(-.70+j*.47,.04,.50),(.44,.85,.065),'wood_medium','paint',0)
    for x in [-1.00,1.00]:
        torus('Cart wooden wheel', (x,.10,.34),.28,.050,dark,surface,rot=(0,math.pi/2,0),seg=16,minor=5)
        for j in range(6):
            a=j*math.pi/3;beam('Wheel spoke',(x,.10,.34),(x,.10+math.cos(a)*.245,.34+math.sin(a)*.245),.034,'wood_honey' if not pbr else 'metal_dark',surface)
        cylinder('Wheel brass hub',(x,.10,.34),.071,.15,'brass','metal',12,(0,math.pi/2,0))
    beam('Wheel axle',(-1.03,.1,.34),(1.03,.1,.34),.058,dark,surface)
    for x in [-.82,.82]:
        box('Awning post',(x,.38,1.35),(.077,.08,1.88),dark,surface,.009)
        cylinder('Post carved cap',(x,.38,2.30),.073,.06,'wood_honey' if not pbr else 'brass',surface,8)
    beam('Awning rear spreader',(-1.07,.57,2.17),(1.07,.57,2.17),.05,dark,surface)
    if pbr:
        box('Industrial kiosk awning',(0,-.01,2.13),(2.24,1.12,.11),'cream','metal',.023,rot=(.06,0,0))
        box('Canopy service edge',(0,-.56,2.06),(2.30,.075,.17),'metal_dark','metal',.014)
        for j in range(5):box('Safety marker',(-.90+j*.45,-.603,2.07),(.11,.012,.06),'brass','paint',0)
    elif style=='bk_project_candidate':
        # Proposed craft geometry, not a claim of verified BK-world architecture.
        grid=[]
        for yy in [-.66,0,.63]:
            for xx in [-1.15,-.77,-.38,0,.38,.77,1.15]:grid.append((xx,yy,2.19+.10*(abs(xx)/1.15)**2+.035*math.cos(yy*2)))
        faces=[]
        for row in range(2):
            for col in range(6):a=row*7+col;faces.append((a,a+1,a+8,a+7))
        poly('Candidate restrained ivory upturned craft awning',grid,faces,'cream')
        beam('Candidate dark timber eave',(-1.16,-.68,2.29),(1.16,-.68,2.29),.031,'wood_dark')
        for xx in [-1.04,1.04]:
            cylinder('Candidate jade tassel cap',(xx,-.65,2.12),.041,.17,'teal','paint',8)
            beam('Candidate tassel cord',(xx,-.65,2.30),(xx,-.65,2.20),.009,'wood_dark')
    else:
        count=7;front=[];middle=[];back=[]
        for i in range(count+1):
            x=-1.14+i*2.28/count;wiggle=.026*math.sin(i*1.4) if style in ['oil_handpaint','bloomwalker_painterly','ghibli_poster'] else 0
            front.append((x,-.65,2.02+wiggle));middle.append((x,-.05,2.28+.018*i/count));back.append((x,.63,2.21+wiggle*.5))
        colors=['cloth_coral','cream','cloth_coral','bread_crust','cloth_coral','pink','cream'] if style!='ghibli_poster' else ['cloth_coral','cream','cloth_coral','cream','cloth_coral','cream','cloth_coral']
        if style=='ghibli_poster':
            points=front+middle+back;faces=[]
            for row in range(2):
                for col in range(count):a=row*(count+1)+col;faces.append((a,a+1,a+count+2,a+count+1))
            poly('Quiet whole-canopy poster pigment mass',points,faces,'cloth_coral','paint',True)
            hem=front+[(x,y-.014,z-.12) for x,y,z in front];faces=[(i,i+1,i+count+2,i+count+1) for i in range(count)]
            poly('Simple cream poster valance',hem,faces,'cream')
        else:
            for i in range(count):
                poly('Tailored striped canopy panel',[front[i],front[i+1],middle[i+1],middle[i],back[i],back[i+1]],[(0,1,2,3),(3,2,5,4)],colors[i])
                a,b=front[i],front[i+1];d=.15+.03*(i%3)
                poly('Scalloped fabric valance',[a,b,(b[0],b[1]-.015,b[2]-d),(a[0],a[1]-.015,a[2]-d*.90)],[(0,1,2,3)],colors[i])
        beam('Canopy front hem rod',(-1.16,-.68,2.03),(1.16,-.68,2.03),.018,'brass','metal')
    # Three real pastry displays and an ingredient grouping; warm/cool hierarchy matters.
    for j,(x,y) in enumerate([(-.64,-.19),(.02,-.07),(.66,.07)]):
        box('Pastry tray base',(x,y,1.15),(.52,.40,.045),'cream' if pbr else 'wood_dark','metal' if pbr else 'paint',.013)
        for xx in [x-.25,x+.25]:box('Pastry tray side',(xx,y,1.19),(.030,.40,.075),'wood_honey' if not pbr else 'metal_dark',surface,0)
        for yy in [y-.19,y+.19]:box('Pastry tray lip',(x,yy,1.19),(.52,.027,.075),'wood_honey' if not pbr else 'metal_dark',surface,0)
        if j==0:
            for k in range(3):
                px=x-.16+k*.16;ellipsoid('Golden baguette',(px,y,1.26),(.08,.19,.078),'bread_crust',seg=10,rings=5,rot=(0,0,.13))
                for q in [-.075,0,.075]:box('Baguette hand-scored cut',(px,q+y,1.325),(.068,.012,.013),'bread_cut','paint',0,rot=(0,0,-.35))
        elif j==1:
            for k in range(3):
                a=k*2.1;ellipsoid('Round crusty roll',(x+.115*math.cos(a),y+.10*math.sin(a),1.25),(.105,.098,.085),'bread_crust',seg=10,rings=5)
                box('Roll cut',(x+.115*math.cos(a),y+.10*math.sin(a),1.327),(.10,.015,.010),'bread_cut','paint',0,rot=(0,0,a))
        else:
            for k in range(2):
                for q in range(4):
                    a=-.8+q*.52;ellipsoid('Curved croissant segment',(x+.105*math.cos(a),y-.12+k*.19+.105*math.sin(a),1.25),(.065,.045,.060),'bread_crust' if q%2==0 else 'wood_honey',seg=8,rings=4,rot=(0,0,a+.2))
    box('Folded indigo tea towel',(.42,-.48,1.139),(.36,.24,.025),'cloth_blue','paint',0,rot=(0,0,-.11))
    box('Wrapping paper stack',(.78,-.35,1.161),(.29,.22,.018),'cream','paint',0,rot=(0,0,.1))
    pot('Small glaze jar',(-.77,.29,1.13),.11,.20,'teal');cylinder('Jar cork',(-.77,.29,1.345),.06,.044,'wood_medium','paint',10)
    # Hanging bread badge is real geometry, not a flat illustration pasted on the prop.
    box('Bakery hanging sign',(.92,-.57,1.66),(.36,.06,.34),'cream','paint',.017,rot=(0,-.07,.04))
    ellipsoid('Badge bread icon',(.92,-.608,1.66),(.105,.014,.065),'bread_crust',seg=10,rings=5)
    for j in range(3):box('Badge cut mark',(.86+j*.055,-.625,1.67),(.016,.008,.06),'bread_cut','paint',0,rot=(0,-.28,0))
    for x in [.80,1.01]:beam('Badge suspension cord',(x,-.57,1.84),(x,-.57,2.27 if style=='bk_project_candidate' else 2.10),.008,'wood_dark')
    # Low side shelf, teal pot and sparse blossoms repeat the accepted stall's vivid focal masses.
    box('Asymmetric planter shelf',(1.17,.15,.57),(.48,.56,.082),'wood_honey','paint',.018)
    beam('Planter shelf support',(1.35,.16,.13),(1.35,.16,.53),.075,'wood_dark',surface)
    pot('Blue herb planter',(1.16,.13,.62),.18,.23,'cloth_blue')
    for j in range(3 if not botanical else 5):
        a=j*2.09;p=np.array([1.16+.10*math.cos(a),.13+.08*math.sin(a),1.03+.06*(j%2)])
        beam('Herb cut stem',(1.16,.13,.82),p,.014,'leaf_dark','leaf');leaf('Large painted herb leaf',p,a,.15,'leaf_dark' if j%2==0 else 'leaf_light')
        if j<2 and not pbr:blossom('Counter blossom',p,.075,'pink' if j==0 else 'violet')
    # Visible lower flour bag and tied cloth add an ingredient/story silhouette.
    ellipsoid('Soft flour sack',(-.55,.10,.66),(.21,.20,.25),'cream',seg=10,rings=5)
    cylinder('Flour sack tie',(-.55,.10,.90),.068,.040,'cloth_coral','paint',8)
    if cel:
        for side in [-1,1]:
            poly('Clean fantasy canopy corner pennant',[(side*1.13,-.67,2.05),(side*1.29,-.67,1.90),(side*1.13,-.67,1.77)],[(0,1,2)],'cloth_blue')
    if botanical:
        beam('Botanical post climbing vine',(.84,.38,1.45),(.90,.39,2.17),.012,'leaf_dark','leaf')
        for j in range(4):
            z=1.72+j*.13;t=(z-1.45)/.72
            leaf('Attached botanical vine leaf',(.84+.06*t,.38+.01*t,z),j*1.5,.15,'leaf_light')

def mesh_arrays(style):
    ps=[];ns=[];uvs=[];mids=[];parts=[]
    pbr_guide=None
    if style=='endfield_pbr_anime':
        guide=ROOT/'atlases'/'endfield_pbr_cell_guide.json'
        if guide.exists():pbr_guide=json.loads(guide.read_text())
    role_map=dict(ROLES)
    # The PBR sheet has explicitly different material semantics, supplied by its painter.
    if pbr_guide and 'role_to_index' in pbr_guide:role_map.update(pbr_guide['role_to_index'])
    if style=='endfield_pbr_anime':role_map.update({'wood_medium':4,'wood_honey':6,'cream':32,'cloth_blue':36,'teal':33,'sage':51,'pink':35,'violet':39,'leaf_light':57,'bread_crust':52,'bread_cut':55,'brass':63,'metal_dark':17})
    for o in PARTS:
        R=o.rot if isinstance(o.rot,np.ndarray) else G.euler(*o.rot);mi=o.p.min(axis=0);ma=o.p.max(axis=0);start=len(ps);tile=role_map[o.role]
        if style=='endfield_pbr_anime':
            if o.kind=='metal' and o.role in ['teal','sage','cloth_blue','pink','violet']:tile=22
            if o.kind=='metal' and o.role in ['wood_medium','wood_honey']:tile=19
            if o.role=='cream':tile=20 if o.kind=='metal' else (32 if any(w in o.name.lower() for w in ['sack','wrapping','paper','cloth']) else 44)
            if any(w in o.name.lower() for w in ['glaze jar','herb planter']):tile=45
            if o.kind=='paint' and any(w in o.name.lower() for w in ['teapot','teacup','cup','mug','saucer','ceramic','planter','glaze','pottery']):
                if o.role in ['teal','sage','cloth_blue']:tile=45
                elif o.role in ['cream','bread_cut']:tile=44
        for tri in o.t:
            p=o.p[tri];fn=np.cross(p[1]-p[0],p[2]-p[0])
            if np.linalg.norm(fn)<1e-9:continue
            fn=G.unit(fn);n=np.tile(fn,(3,1)) if o.n is None else o.n[tri];drop=int(np.argmax(abs(fn)));axes=[i for i in range(3) if i!=drop]
            # Author large broad pigment islands as in the approved source, never tiny repeat noise.
            axes.sort(key=lambda i:ma[i]-mi[i],reverse=True)
            a=(p[:,axes[0]]-mi[axes[0]])/max(.001,float(ma[axes[0]]-mi[axes[0]]));b=(p[:,axes[1]]-mi[axes[1]])/max(.001,float(ma[axes[1]]-mi[axes[1]]))
            uv=np.column_stack(((tile%8+.13+.74*a)/8,(tile//8+.13+.74*(1-b))/8))
            ps.append(p@R.T+o.loc);ns.append(G.unit(n@R.T));uvs.append(uv);mids.append({'paint':0,'metal':1,'leaf':2}[o.kind])
        parts.append({'name':o.name,'surface':o.kind,'color_role':o.role,'atlas_cell_top_left_index':tile,'triangle_start':start,'triangle_count':len(ps)-start})
    return {'position':np.asarray(ps,dtype=F),'normal':np.asarray(ns,dtype=F),'uv':np.asarray(uvs,dtype=F),'material':np.asarray(mids,dtype=np.uint8)},parts

def write_glb(name,style,a,atlas):
    blob=bytearray();views=[];accessors=[];prims=[]
    def add_bytes(data,target=None):
        while len(blob)%4:blob.append(0)
        off=len(blob);blob.extend(data);v={'buffer':0,'byteOffset':off,'byteLength':len(data)}
        if target:v['target']=target
        views.append(v);return len(views)-1
    def acc(arr,typ,component,target):
        vi=add_bytes(arr.tobytes(),target);ac={'bufferView':vi,'componentType':component,'count':len(arr),'type':typ}
        if typ=='VEC3':ac['min']=arr.min(axis=0).tolist();ac['max']=arr.max(axis=0).tolist()
        accessors.append(ac);return len(accessors)-1
    for mid in range(3):
        ids=np.where(a['material']==mid)[0]
        if not len(ids):continue
        p=a['position'][ids].reshape(-1,3);n=a['normal'][ids].reshape(-1,3);uv=a['uv'][ids].reshape(-1,2).astype('<f4')
        p=np.column_stack((p[:,0],p[:,2],-p[:,1])).astype('<f4');n=np.column_stack((n[:,0],n[:,2],-n[:,1])).astype('<f4');ind=np.arange(len(p),dtype='<u4')
        pi=acc(p,'VEC3',5126,34962);ni=acc(n,'VEC3',5126,34962);ui=acc(uv,'VEC2',5126,34962);ii=acc(ind,'SCALAR',5125,34963);prims.append({'attributes':{'POSITION':pi,'NORMAL':ni,'TEXCOORD_0':ui},'indices':ii,'material':mid,'mode':4})
    image_view=add_bytes(atlas.read_bytes());image_views=[image_view]
    orm_path=ROOT/'atlases/endfield_pbr_orm_runtime1024.png'
    if style=='endfield_pbr_anime':
        if not orm_path.exists():
            rough=[.80,.85,.72,.75,.72,.70,.68,.89,.82,.87,.74,.77,.71,.76,.81,.84,.60,.32,.55,.33,.58,.60,.55,.68,.37,.45,.70,.40,.68,.77,.71,.72,.94,.93,.92,.91,.92,.71,.68,.65,.90,.87,.90,.92,.35,.30,.82,.90,.62,.67,.60,.62,.86,.74,.77,.97,.58,.54,.61,.95,.70,.40,.56,.33]
            metallic=[0.]*64
            for idx,value in {16:.85,17:1,18:1,19:1,24:.85,25:.85,26:.70,27:.85,60:.85,61:1,62:.85,63:1}.items():metallic[idx]=value
            data=np.full((1024,1024,3),255,dtype=np.uint8)
            for idx in range(64):
                y,x=divmod(idx,8);data[y*128:(y+1)*128,x*128:(x+1)*128,1]=round(rough[idx]*255);data[y*128:(y+1)*128,x*128:(x+1)*128,2]=round(metallic[idx]*255)
            Image.fromarray(data).save(orm_path)
            (ROOT/'sources/endfield_pbr_orm_parameters.json').write_text(json.dumps({'channel_layout':'R=1 optional occlusion, G=roughness, B=metallic','index_origin':'zero-based top-left','roughness':rough,'metallic':metallic,'strategy':'Authored by true material class. Paint/enamel, cloth, wood, leaf, pastry and ceramic are non-metallic. Only exposed metal/copper/brass cells are metallic. Quiet geometry normals; no synthetic noise-normal texture replacing the source atlas.'},indent=2))
        image_views.append(add_bytes(orm_path.read_bytes()))
    while len(blob)%4:blob.append(0)
    materials=[{'name':'BroadPaint_'+style,'doubleSided':True,'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'roughnessFactor':.91,'metallicFactor':0}}, {'name':'SelectiveMetal_'+style,'doubleSided':True,'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'roughnessFactor':.33 if style=='endfield_pbr_anime' else .48,'metallicFactor':.95}}, {'name':'PaintedFoliage_'+style,'doubleSided':True,'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'roughnessFactor':.81,'metallicFactor':0}}]
    if style=='endfield_pbr_anime':
        for material in materials:material['pbrMetallicRoughness'].update({'metallicRoughnessTexture':{'index':1},'roughnessFactor':1,'metallicFactor':1})
    else:
        material_rough={'oil_handpaint':(.91,.50,.91),'genshin_cel':(.86,.30,.90),'ghibli_poster':(.98,.80,.96),'bloomwalker_painterly':(.80,.49,.78),'bk_project_candidate':(.88,.42,.84)}[style]
        for material,rough in zip(materials,material_rough):material['pbrMetallicRoughness']['roughnessFactor']=rough
    doc={'asset':{'version':'2.0','generator':'Editable premium market-prop pipeline'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':name,'mesh':0}],'meshes':[{'name':name,'primitives':prims}],'materials':materials,'textures':[{'source':i,'sampler':0} for i in range(len(image_views))],'images':[{'bufferView':v,'mimeType':'image/png'} for v in image_views],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':accessors,'extras':{'style_direction':style,'source_texture':atlas.name,'scope':'Actual static GLB with approved-quality texture atlas. CPU art-direction previews and future Blender NPR shaders are separate; no Unity runtime acceptance.'}}
    raw=json.dumps(doc,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4);data=struct.pack('<4sII',b'glTF',2,12+8+len(raw)+8+len(blob))+struct.pack('<I4s',len(raw),b'JSON')+raw+struct.pack('<I4s',len(blob),b'BIN\0')+blob;path=ROOT/'models'/f'{style}_{name}.glb';path.write_bytes(data);return path,doc
def main():
    style=sys.argv[1] if len(sys.argv)>1 else 'oil_handpaint';name=sys.argv[2] if len(sys.argv)>2 else 'bread_cart';atlas=ROOT/'atlases'/ATLAS[style]
    if not atlas.exists():raise RuntimeError('Wait for actual premium texture atlas: '+str(atlas))
    if name=='bread_cart':bread_cart(style)
    else:
        source=ROOT/'recipes'/f'{style}_{name}.json'
        if not source.exists():raise RuntimeError('Unknown recipe: '+str(source))
        recipe=json.loads(source.read_text())
        for p in recipe['parts']:
            sh=p['shape'];n=p['name'];role=p['color_role'];surface=p.get('surface','paint');rot=p.get('rotation',[0,0,0])
            if sh=='box':box(n,p['position'],p['size'],role,surface,p.get('bevel',.012),rot)
            elif sh=='ellipsoid':ellipsoid(n,p['position'],p['radii'],role,surface,p.get('segments',12),p.get('rings',6),rot)
            elif sh=='cylinder':cylinder(n,p['position'],p['radius'],p['height'],role,surface,p.get('segments',12),rot,p.get('radius_top'))
            elif sh=='beam':beam(n,p['a'],p['b'],p['width'],role,surface,p.get('depth'),p.get('bevel',0))
            elif sh=='lathe':lathe(n,p['position'],p['profile'],role,surface,p.get('segments',16))
            elif sh=='mesh':poly(n,p['vertices'],p['faces'],role,surface,p.get('smooth',False))
            elif sh=='torus':torus(n,p['position'],p['major_radius'],p['minor_radius'],role,surface,rot,p.get('segments',16),p.get('minor_segments',5))
            else:raise RuntimeError('Unknown primitive: '+sh)
    a,parts=mesh_arrays(style);tri=len(a['position']);assert tri<=6000,tri
    np.savez_compressed(ROOT/'models'/f'{style}_{name}.npz',**a);path,doc=write_glb(name,style,a,atlas)
    (ROOT/'recipes'/f'{style}_{name}.json').write_text(json.dumps({'name':name,'style_direction':style,'atlas':str(atlas.relative_to(ROOT)),'uv_origin':'top-left image / glTF convention','parts':REC,'compiled_parts':parts},indent=2,default=lambda x:float(x) if isinstance(x,np.generic) else x.tolist()))
    report={'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'triangles':tri,'editable_parts':len(PARTS),'actual_materials':len(doc['materials']),'actual_primitives':len(doc['meshes'][0]['primitives']),'atlas_file':str(atlas.relative_to(ROOT)),'atlas_sha256':hashlib.sha256(atlas.read_bytes()).hexdigest(),'uv_inner_cell_margin':.13,'style_direction':style,'build_rss_peak_kib':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,'texture_quality_reference':'Approved earlier flower stall, not the rejected technical fixture','runtime_validation':'pending; GLB numerical round-trip follows separately'}
    (ROOT/'validation'/f'{style}_{name}_build.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if __name__=='__main__':main()
