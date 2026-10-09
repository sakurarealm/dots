"""Original Endfield/Bloomwalker-inspired barrel shapes. Offline Blender QA only."""
import bpy, bmesh, math, json, pathlib, datetime, hashlib, os, time, shutil, traceback
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = pathlib.Path('/workspace/shared/aether-production-20261008/barrel-composter')
REFERENCE = BASE / 'source/aether_wooden_barrel_v01_sample.blend'
LIBRARY = BASE / 'styles/source/barrel_six_styles_library.blend'
ART = pathlib.Path('/workspace/shared/aether-style-comparison')
RECIPES = {r['id']: r for r in json.loads((ART/'style-recipes.json').read_text())['styles']}
for d in ('source','exports','previews','reports','textures'): (ROOT/d).mkdir(exist_ok=True)
OUTPUTS = json.loads((ROOT/'status.json').read_text()).get('outputs',[]) if (ROOT/'status.json').exists() else []

def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def stage(code, zh, state='running', output=None):
    if output and output not in OUTPUTS: OUTPUTS.append(output)
    n=now(); p=ROOT/'status.json'; q=p.with_suffix('.tmp')
    q.write_text(json.dumps({'state':state,'stage':code,'stage_zh':zh,'updated_at_utc':n,'heartbeat_at_utc':n,'purpose':'Two original editable barrel shape-language candidates; reused original matching style textures; offline authoring/export review only','outputs':OUTPUTS},indent=2,ensure_ascii=False)); q.replace(p)
    with open(ROOT/'events.jsonl','a') as f: f.write(json.dumps({'at_utc':n,'stage':code,'stage_zh':zh,'state':state,'output':output},ensure_ascii=False)+'\n')

def guard(action):
    while True:
        available=int(next(x for x in open('/proc/meminfo') if x.startswith('MemAvailable:')).split()[1])*1024
        disk=os.statvfs(ROOT); free=disk.f_bavail*disk.f_frsize
        if available>=2*1024**3 and free>=3*1024**3:
            stage('resources_safe_'+action,'资源检查通过：'+action)
            with open(ROOT/'reports/resource_checks.jsonl','a') as f: f.write(json.dumps({'at_utc':now(),'action':action,'mem_available_bytes':available,'disk_available_bytes':free,'threads':2})+'\n')
            return
        stage('resource_wait','等待安全余量（内存≥2GiB、磁盘≥3GiB）'); time.sleep(30)

def scene_settings():
    s=bpy.context.scene; bpy.context.view_layer.update()
    return {'camera':{'matrix':[list(row) for row in s.camera.matrix_world],'type':s.camera.data.type,'ortho_scale':s.camera.data.ortho_scale,'lens':s.camera.data.lens},'lights':[{'name':o.name,'matrix':[list(row) for row in o.matrix_world],'type':o.data.type,'energy':o.data.energy,'size':o.data.size} for o in sorted(s.objects,key=lambda x:x.name) if o.type=='LIGHT'],'world_color':list(s.world.node_tree.nodes['Background'].inputs[0].default_value),'world_strength':s.world.node_tree.nodes['Background'].inputs[1].default_value,'exposure':s.view_settings.exposure,'view_transform':s.view_settings.view_transform,'look':s.view_settings.look,'gamma':s.view_settings.gamma,'render_engine':s.render.engine,'samples':s.cycles.samples,'denoising':s.cycles.use_denoising,'resolution':[s.render.resolution_x,s.render.resolution_y],'percentage':s.render.resolution_percentage}
def signature(data): return hashlib.sha256(json.dumps(data,sort_keys=True,separators=(',',':')).encode()).hexdigest()

objects=[]; wood=None; iron=None; col=None
def mesh(name, vertices, faces, material=None, uv=None, smooth=False, bevel=0):
    me=bpy.data.meshes.new(name+'_Mesh'); me.from_pydata(vertices,[],faces); me.update()
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    ob=bpy.data.objects.new(name,me); col.objects.link(ob); me.materials.append(material or wood)
    layer=me.uv_layers.new(name='UV0')
    for poly in me.polygons:
        poly.use_smooth=smooth and abs(poly.normal.z)<.999
        for li in poly.loop_indices:
            co=me.vertices[me.loops[li].vertex_index].co
            layer.data[li].uv=uv(co,poly.normal) if uv else (co.x/.95+.5,co.y/.95+.5) if abs(poly.normal.z)>.6 else (co.x+.5,co.z)
    if bevel:
        bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active=ob
        mod=ob.modifiers.new('Restrained_Structural_Chamfer','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name); ob.select_set(False)
    group=ob.vertex_groups.new(name=name);group.add(list(range(len(me.vertices))),1.0,'REPLACE');objects.append(ob);return ob

def box(name, center, dims, material=None, bevel=0, angle=0):
    x,y,z=center; dx,dy,dz=[v/2 for v in dims];c=math.cos(angle);s=math.sin(angle)
    v=[(x+sx*dx*c-sy*dy*s,y+sx*dx*s+sy*dy*c,z+sz*dz) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    return mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],material,bevel=bevel)

def sector(name, t0, t1, levels, thickness, j, subdivisions=2, material=None, smooth=False):
    # Closed thick panel. Local UV range reuses one of the original eight grain columns.
    k=subdivisions+1; v=[]
    for z,r in levels:
        for rr in (r,r-thickness):
            for a in range(k):
                t=t0+(t1-t0)*a/subdivisions;v.append((rr*math.cos(t),rr*math.sin(t),z))
    f=[]
    for z in range(len(levels)-1):
        p=2*k*z;q=p+2*k
        for a in range(subdivisions): f.extend([(p+a,p+a+1,q+a+1,q+a),(p+k+a,q+k+a,q+k+a+1,p+k+a+1)])
        f.extend([(p,p+2*k,p+3*k,p+k),(p+k-1,p+2*k-1,p+4*k-1,p+3*k-1)])
    last=2*k*(len(levels)-1)
    for a in range(subdivisions):f.extend([(a,a+k,a+k+1,a+1),(last+a,last+a+1,last+k+a+1,last+k+a)])
    def uv(co,n):
        t=math.atan2(co.y,co.x)
        while t<t0-math.pi:t+=math.tau
        while t>t1+math.pi:t-=math.tau
        return (.006+(j%8)*.125+(t-t0)/(t1-t0)*.113,.02+co.z*.91)
    return mesh(name,v,f,material or wood,uv,smooth)

def ring(name, profile, n=24, material=None, wave=0, smooth=False):
    # A closed swept ring: profile is ordered (radius, z), never open-ended.
    v=[];m=len(profile)
    for t_index in range(n):
        t=math.tau*t_index/n
        for r,z in profile:
            w=wave*math.sin(3*t+.6);rr=r+wave*.18*math.sin(5*t)
            v.append((rr*math.cos(t),rr*math.sin(t),z+w))
    f=[(a*m+b,((a+1)%n)*m+b,((a+1)%n)*m+(b+1)%m,a*m+(b+1)%m) for a in range(n) for b in range(m)]
    return mesh(name,v,f,material or iron,smooth=smooth)

def solid_cylinder(name,radius,z0,z1,n=12,material=None):
    v=[(radius*math.cos(math.tau*a/n),radius*math.sin(math.tau*a/n),z) for z in (z0,z1) for a in range(n)]
    f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(a,(a+1)%n,(a+1)%n+n,a+n) for a in range(n)]
    return mesh(name,v,f,material or wood)

def disc(name, center, normal, radius=.009, depth=.006, n=6, material=None):
    cen=Vector(center);normal=Vector(normal);u=Vector((-normal.y,normal.x,0)).normalized();w=normal.cross(u).normalized();v=[]
    for dep,rad in ((0,radius), (depth,radius*.82)):
        for a in range(n): t=math.tau*a/n;v.append(tuple(cen+normal*dep+(u*math.cos(t)+w*math.sin(t))*rad))
    f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(a,(a+1)%n,(a+1)%n+n,a+n) for a in range(n)]
    return mesh(name,v,f,material or iron,smooth=False)

def clip(poly, axis, limit, positive):
    out=[]
    for i,q in enumerate(poly):
        p=poly[i-1];ip=p[axis]>=limit if positive else p[axis]<=limit;iq=q[axis]>=limit if positive else q[axis]<=limit
        if ip!=iq:
            t=(limit-p[axis])/(q[axis]-p[axis]);out.append((p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])))
        if iq:out.append(q)
    return out

def lid(rad,z,count,round_crown=False):
    circ=[(rad*math.cos(math.tau*a/32),rad*math.sin(math.tau*a/32)) for a in range(32)];step=2*rad/count
    for j in range(count):
        poly=clip(clip(circ,1,-rad+j*step+.0025,True),1,-rad+(j+1)*step-.0025,False);l=len(poly)
        v=[(x,y,z-.025) for x,y in poly]+[(x,y,z+(.012*(1-(x*x+y*y)/(rad*rad)) if round_crown else 0)) for x,y in poly]
        f=[tuple(reversed(range(l))),tuple(range(l,2*l))]+[(a,(a+1)%l,(a+1)%l+l,a+l) for a in range(l)]
        mesh('Lid_Panel_%02d'%j,v,f,wood,lambda co,n:(.10+(co.y+rad)*.84,.10+(co.x+rad)*.9),smooth=False)

def handle(name,t):
    # Chamfered rectangular, hollow, physically thick D-grip in the tangent/z plane.
    u=Vector((-math.sin(t),math.cos(t),0));normal=Vector((math.cos(t),math.sin(t),0));cen=normal*.47+Vector((0,0,.71))
    def rect(a,b,c):return [(-a+c,-b),(a-c,-b),(a,-b+c),(a,b-c),(a-c,b),(-a+c,b),(-a,b-c),(-a,-b+c)]
    outer=rect(.078,.082,.014);inner=rect(.047,.050,.010);v=[]
    for dep in (-.012,.012):
        for outline in (outer,inner):
            for x,z in outline:v.append(tuple(cen+u*x+Vector((0,0,z))+normal*dep))
    f=[]
    for a in range(8):b=(a+1)%8;f.extend([(a,b,b+16,a+16),(a+8,a+24,b+24,b+8),(a,a+8,b+8,b),(a+16,b+16,b+24,a+24)])
    mesh(name,v,f,iron)
    for sign in (-1,1):box(name+'_Mount_'+str(sign),tuple(normal*.444+Vector((0,0,.71+sign*.057))),(.038,.040,.038),iron,bevel=.003,angle=t)

def build_endfield():
    levels=[(.055,.395),(.09,.419),(.17,.436),(.87,.436),(.967,.418),(1.017,.394)]
    for j in range(12):sector('Modular_Wood_Panel_%02d'%j,math.tau*j/12+.007,math.tau*(j+1)/12-.007,levels,.028,j,2)
    ring('Bottom_Protective_Flange',[(.367,0),(.435,0),(.451,.017),(.451,.059),(.436,.080),(.403,.080),(.392,.057),(.367,.016)],24)
    ring('Top_Closure_Flange',[(.381,.991),(.431,.991),(.451,1.010),(.451,1.040),(.433,1.060),(.395,1.060),(.381,1.046)],24)
    for j in range(6):
        t=math.tau*j/6+.26
        sector('Vertical_Frame_Strap_%02d'%j,t-.035,t+.035,[(.07,.42),(.17,.444),(.87,.444),(1.005,.409)],.016,j,1,iron)
        for k,z in enumerate((.187,.853)):
            disc('Frame_Fastener_%02d_%d'%(j,k),(.447*math.cos(t),.447*math.sin(t),z),(math.cos(t),math.sin(t),0),.009,.005,6)
    lid(.375,1.016,6)
    box('Lid_Cross_Brace', (0,0,1.031), (.695,.050,.026),iron,bevel=.004)
    for x in (-.265,.265):box('Lid_Brace_Clamp_'+str(x),(x,0,1.047),(.064,.085,.027),iron,bevel=.003)
    handle('Side_D_Grip_Left',0);handle('Side_D_Grip_Right',math.pi)
    box('Front_Closure_Latch',(0,-.433,.963),(.067,.019,.115),iron,bevel=.004)
    for z in (.928,.992):disc('Latch_Screw_'+str(z),(0,-.446,z),(0,-1,0),.006,.003,6)
    # Hidden closed bottom protects storage semantics.
    solid_cylinder('Bottom_Wood_Closure',.389,.032,.055,12,wood)

def foot(name,t):
    cen=Vector((.345*math.cos(t),.345*math.sin(t),0));v=[];n=10
    rings=[(0,.042),(.018,.063),(.059,.068),(.109,.055),(.145,.033)]
    for z,r in rings:
        for a in range(n):
            angle=math.tau*a/n;v.append(tuple(cen+Vector((r*math.cos(angle),r*math.sin(angle)*.88,z))))
    f=[tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))]
    f += [(a*n+b,a*n+(b+1)%n,(a+1)*n+(b+1)%n,(a+1)*n+b) for a in range(len(rings)-1) for b in range(n)]
    return mesh(name,v,f,wood,smooth=True)

def build_bloomwalker():
    zrs=[(.079,.344),(.132,.399),(.245,.465),(.441,.503),(.654,.499),(.837,.457),(.937,.402),(.985,.382)]
    for j in range(12):
        phase=math.sin(j*1.7);levels=[(z+(.004*phase if z>.9 else 0),r+.003*phase) for z,r in zrs]
        sector('Organic_Curved_Stave_%02d'%j,math.tau*j/12+.010,math.tau*(j+1)/12-.010,levels,.027,j,2,smooth=True)
    # A closed low-poly inner lining blocks through-light at offset stave gaps.
    # Its 288 triangles keep the total at 2960, without another material slot.
    inner_levels=[(.079,.305),(.245,.430),(.441,.465),(.654,.460),(.937,.365),(.985,.343)]
    liner_profile=[(r,z) for z,r in inner_levels]+[(r-.012,z) for z,r in reversed(inner_levels)]
    ring('Closed_Inner_Seam_Lining',liner_profile,12,wood,smooth=False)
    profile=[(.382+.037*math.cos(math.tau*a/8),.980+.037*math.sin(math.tau*a/8)) for a in range(8)]
    ring('Rounded_Wood_Lip',profile,24,wood,wave=.003,smooth=True)
    for k,z,r in ((0,.267,.478),(1,.757,.483)):
        profile=[(r+.017*math.cos(math.tau*a/6),z+.026*math.sin(math.tau*a/6)) for a in range(6)]
        ring('Soft_Wavy_Hoop_%02d'%k,profile,24,iron,wave=.010,smooth=True)
        for j,t in enumerate((-.75,math.pi-.75)):
            disc('Rounded_Wood_Hoop_Peg_%d_%d'%(k,j),((r+.018)*math.cos(t),(r+.018)*math.sin(t),z+.010*math.sin(3*t+.6)),(math.cos(t),math.sin(t),0),.017,.013,8,wood)
    lid(.358,.954,5,True)
    for j,t in enumerate((-.5*math.pi,math.pi/6,5*math.pi/6)):foot('Rounded_Short_Foot_%02d'%j,t)
    solid_cylinder('Bottom_Wood_Closure',.333,.095,.121,12,wood)

def qa(ob):
    ob.data.calc_loop_triangles();coords=[ob.matrix_world@v.co for v in ob.data.vertices]
    bm=bmesh.new();bm.from_mesh(ob.data);zero=sum(f.calc_area()<1e-10 for f in bm.faces);boundary=sum(e.is_boundary for e in bm.edges);nonmanifold=sum(not e.is_manifold for e in bm.edges);bm.free()
    bounds={'min':[min(v[i] for v in coords) for i in range(3)],'max':[max(v[i] for v in coords) for i in range(3)]}
    uv=ob.data.uv_layers.active
    return {'triangles':len(ob.data.loop_triangles),'vertices':len(ob.data.vertices),'polygons':len(ob.data.polygons),'material_slots':[m.name for m in ob.data.materials],'material_count':len(ob.data.materials),'component_vertex_groups':[g.name for g in ob.vertex_groups],'bounds_m':bounds,'dimensions_m':[bounds['max'][i]-bounds['min'][i] for i in range(3)],'origin_world_m':list(ob.matrix_world.translation),'object_scale':list(ob.scale),'object_rotation_radians':list(ob.rotation_euler),'uv_layers':[x.name for x in ob.data.uv_layers],'uv_loops':len(uv.data) if uv else 0,'uv_finite':bool(uv) and all(math.isfinite(v) for q in uv.data for v in q.uv),'zero_area_faces':zero,'boundary_edges':boundary,'nonmanifold_edges':nonmanifold,'closed_components':'Disconnected closed authored pieces are intentional; no Boolean union','unit_scale_length':bpy.context.scene.unit_settings.scale_length}

def welded_geometry_qa(ob):
    # Interchange may split a source vertex at UV/material/normal seams. This is
    # a temporary geometry-only diagnostic, never a mutation of delivered mesh.
    bm=bmesh.new();bm.from_mesh(ob.data);before=len(bm.verts)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
    out={'input_attribute_split_vertices':before,'coincident_position_welded_vertices':len(bm.verts),'weld_distance_m':1e-7,'zero_area_faces':sum(f.calc_area()<1e-10 for f in bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'method':'Temporary BMesh merge of coincident positions only; original UV/normal-split mesh and delivery file are unchanged'}
    bm.free();return out

def merged_asset(id):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=bpy.context.object;ob.name='aether_barrel_shape_'+id;ob.data.name=ob.name+'_Mesh'
    mats=[];old=list(ob.data.materials)
    for m in old:
        if m not in mats:mats.append(m)
    assignments=[mats.index(old[p.material_index]) for p in ob.data.polygons];ob.data.materials.clear()
    for m in mats:ob.data.materials.append(m)
    for p,i in zip(ob.data.polygons,assignments):p.material_index=i
    bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    ob['unit']='1 unit = 1 metre';ob['pivot']='base_center';ob['style_scope']='Original general shape-language inspiration; no copied proprietary model, logo, or game asset';ob['preview_validation']='Offline Blender comparison; no Unity/runtime/mobile acceptance'
    return ob

def portable_materials(ob,id):
    original=list(ob.data.materials);portable=[]
    for m in original:
        cp=m.copy();cp.name=m.name+'_PortablePBR';p=cp.node_tree.nodes.get('Principled BSDF');tex=cp.node_tree.nodes.get('Shared_Source_Albedo')
        if tex:cp.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
        portable.append(cp)
    for i,m in enumerate(portable):ob.data.materials[i]=m
    return original,portable

def roundtrip(file, expected):
    guard('reimport_'+file.stem+'_'+file.suffix[1:]);bpy.ops.wm.read_factory_settings(use_empty=True)
    if file.suffix=='.glb':bpy.ops.import_scene.gltf(filepath=str(file))
    else:bpy.ops.import_scene.fbx(filepath=str(file))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(meshes)==1
    ob=meshes[0];m=qa(ob);welded=welded_geometry_qa(ob);textures=[]
    for im in bpy.data.images:
        if im.source=='FILE':textures.append({'name':im.name,'dimensions':list(im.size),'packed':bool(im.packed_file),'exists_or_packed':bool(im.packed_file) or pathlib.Path(bpy.path.abspath(im.filepath)).exists()})
    dimdelta=max(abs(x-y) for x,y in zip(m['dimensions_m'],expected['dimensions_m']));origdelta=max(abs(x) for x in m['origin_world_m'])
    checks={'one_mesh':len(meshes)==1,'triangles_equal':m['triangles']==expected['triangles'],'triangles_budget':m['triangles']<=3000,'two_materials':m['material_count']==2,'dimensions_within_1e_5_m':dimdelta<=1e-5,'base_origin_within_1e_6_m':origdelta<=1e-6,'uv_present_finite':m['uv_loops']>0 and m['uv_finite'],'zero_degenerate_faces':m['zero_area_faces']==0,'closed_geometry_after_attribute_split_weld':welded['boundary_edges']==0 and welded['nonmanifold_edges']==0 and welded['zero_area_faces']==0,'wood_texture_embedded_available':len(textures)>=1 and all(t['exists_or_packed'] and t['dimensions']==[1254,1254] for t in textures)}
    report={'file':str(file),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size,'importer':'Actual Blender '+bpy.app.version_string+' '+file.suffix[1:].upper()+' importer','metrics':m,'geometry_only_weld_diagnostic':welded,'textures':textures,'checks':checks,'pass':all(checks.values()),'dimensions_max_delta_m':dimdelta,'topology_note':'GLB uses separate vertices at UV/normal/material seams. Raw import boundary count is recorded, not silently treated as watertight topology; only a temporary positional-weld diagnostic establishes geometric closure.','boundary':'This proves Blender export/reimport only; Unity/import settings/shader/runtime/mobile/device performance untested'}
    assert report['pass'], report
    return report

def run_style(id,builder):
    global objects,wood,iron,col
    guard('load_'+id);stage('build_'+id,'构建独立造型：'+RECIPES[id]['label'])
    bpy.ops.wm.open_mainfile(filepath=str(REFERENCE));s=bpy.context.scene;s.render.threads_mode='FIXED';s.render.threads=2
    fixed=scene_settings();assert fixed['resolution']==[768,768] and fixed['samples']==48 and fixed['denoising']==False
    old=bpy.data.objects['aether_wooden_barrel_v01'];col=old.users_collection[0];bpy.data.objects.remove(old,do_unlink=True)
    with bpy.data.libraries.load(str(LIBRARY),link=False) as (src,dst):dst.materials=['M_Style_'+id+'_Wood','M_Style_'+id+'_Iron']
    wood,iron=dst.materials;objects=[];builder();ob=merged_asset(id);metrics=qa(ob)
    assert metrics['triangles']<=3000 and metrics['material_count']==2 and metrics['zero_area_faces']==0 and metrics['nonmanifold_edges']==0, metrics
    assert scene_settings()==fixed
    texture=ART/'textures'/RECIPES[id]['texture'];shutil.copy2(texture,ROOT/'textures'/texture.name)
    source=ROOT/'source'/(ob.name+'.blend');fbx=ROOT/'exports'/(ob.name+'.fbx');glb=ROOT/'exports'/(ob.name+'.glb')
    previews={}
    for res in (512,768):
        guard('render_'+id+'_'+str(res));stage('render_'+id+'_'+str(res),'固定原相机/灯光渲染：'+RECIPES[id]['label']+' '+str(res))
        s.render.resolution_x=res;s.render.resolution_y=res;s.render.filepath=str(ROOT/'previews'/('barrel_shape_'+id+'_'+str(res)+'.png'));bpy.ops.render.render(write_still=True);previews[str(res)]=s.render.filepath
        stage('preview_ready_'+id+'_'+str(res),'造型预览已生成：'+RECIPES[id]['label'],output={'path':s.render.filepath,'purpose':'Fixed camera/lights/exposure '+str(res)+'px comparison render'})
    s.render.resolution_x=s.render.resolution_y=768;assert scene_settings()==fixed
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    for im in bpy.data.images:
        if im.source=='FILE':im.pack()
    guard('save_'+id);bpy.ops.wm.save_as_mainfile(filepath=str(source))
    original,portable=portable_materials(ob,id)
    guard('export_'+id+'_fbx');bpy.ops.export_scene.fbx(filepath=str(fbx),use_selection=True,object_types={'MESH'},apply_unit_scale=True,global_scale=1.0,axis_forward='-Z',axis_up='Y',use_mesh_modifiers=True,mesh_smooth_type='FACE',path_mode='COPY',embed_textures=True,add_leaf_bones=False,bake_anim=False)
    guard('export_'+id+'_glb');bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_yup=True,export_animations=False)
    for i,m in enumerate(original):ob.data.materials[i]=m
    differences={'endfield':['12 broad modular panels with straight mid-walls and deliberate shoulder breaks','Top/bottom protective flanges instead of two simple hoops','Six vertical structural straps with hex fasteners','Two hollow chamfered side D-grips; cross-braced lid and front closure latch'],'bloomwalker':['12 fuller convex organic staves with varied shoulder/rim heights','Thick rounded wooden lip and softly crowned lid panels','Two vertically wavy, rounded sage hoop sections with wood pegs','Three rounded short feet lift the base and change the lower silhouette','Closed inner lining backs intentional stave joints and blocks see-through studio background']}[id]
    record={'id':id,'label':RECIPES[id]['label'],'blender_version':bpy.app.version_string,'purpose':'Original shape plus existing matching material comparison candidate','source':str(source),'fbx':str(fbx),'glb':str(glb),'preview_512':previews['512'],'preview_768':previews['768'],'texture':str(ROOT/'textures'/texture.name),'texture_sha256':hashlib.sha256(texture.read_bytes()).hexdigest(),'metrics':metrics,'shape_changes':differences,'fixed_scene':fixed,'fixed_scene_sha256':signature(fixed),'source_reference':str(REFERENCE),'source_reference_sha256':hashlib.sha256(REFERENCE.read_bytes()).hexdigest(),'export_material_note':'Exports use temporary portable Principled PBR materials with direct original albedo, same roughness/metallic. Native .blend uses original style nodes; soft art grouping is not a portable native engine shader.','uv_note':'UV0 reuses original eight grain columns intentionally; directional reusable islands, no unique lightmap UV','limitations':['Original style inspiration only, not exact branded game asset/shader','Original generated 1254px comparison textures; mobile texture budget not certified','No Unity/native shader/collision/gameplay/runtime/mobile/device checks']}
    (ROOT/'reports'/(id+'_manifest.json')).write_text(json.dumps(record,indent=2,ensure_ascii=False))
    stage('exports_ready_'+id,'造型源文件和导出已生成：'+RECIPES[id]['label'],output={'path':str(source),'purpose':'Editable Blender mesh with named component groups and packed matching original style texture'})
    reports=[roundtrip(fbx,metrics),roundtrip(glb,metrics)]
    rpt=ROOT/'reports'/(id+'_roundtrip.json');rpt.write_text(json.dumps({'scope':'Actual Blender FBX/GLB reimport check only','records':reports},indent=2,ensure_ascii=False));record['roundtrip']=str(rpt);record['roundtrip_pass']=all(x['pass'] for x in reports)
    (ROOT/'reports'/(id+'_manifest.json')).write_text(json.dumps(record,indent=2,ensure_ascii=False));stage('review_'+id,'真实导出重导入检查通过：'+RECIPES[id]['label'],'review',{'path':str(rpt),'purpose':'Exact metrics and real FBX/GLB import evidence'})
    print('STYLE_READY '+json.dumps({'id':id,'preview_512':previews['512'],'source':str(source),'fbx':str(fbx),'glb':str(glb),'triangles':metrics['triangles'],'manifest':str(ROOT/'reports'/(id+'_manifest.json')),'roundtrip':str(rpt)},ensure_ascii=False),flush=True)
    return record

try:
    records=[]
    for id,builder in [('endfield',build_endfield),('bloomwalker',build_bloomwalker)]:
        existing=ROOT/'reports'/(id+'_manifest.json')
        if existing.exists() and os.environ.get('AETHER_FORCE_STYLE')!=id:
            record=json.loads(existing.read_text())
            if all(pathlib.Path(record[k]).exists() for k in ('source','fbx','glb','preview_512','preview_768')):
                reports=[roundtrip(pathlib.Path(record[k]),record['metrics']) for k in ('fbx','glb')];rpt=ROOT/'reports'/(id+'_roundtrip.json');rpt.write_text(json.dumps({'scope':'Actual Blender FBX/GLB reimport check only','records':reports},indent=2,ensure_ascii=False));record['roundtrip']=str(rpt);record['roundtrip_pass']=all(x['pass'] for x in reports);existing.write_text(json.dumps(record,indent=2,ensure_ascii=False));stage('review_'+id,'真实导出重导入检查通过：'+RECIPES[id]['label'],'review',{'path':str(rpt),'purpose':'Exact metrics and real FBX/GLB import evidence'});records.append(record);print('RECOVERED_STYLE_READY '+id,flush=True);continue
        records.append(run_style(id,builder))
    summary={'state':'review','scope':'Two genuinely different original barrel meshes and existing matching material treatments','records':records,'not_tested':['Unity','current project native material routing','mobile devices']}
    (ROOT/'reports/pair_manifest.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False));stage('pair_ready','两款造型及真实重导入检查就绪，等待视觉审阅','review',{'path':str(ROOT/'reports/pair_manifest.json'),'purpose':'Two-variant delivery manifest'})
    if (ROOT/'reports/error.txt').exists():(ROOT/'reports/error.txt').unlink()
except Exception:
    (ROOT/'reports/error.txt').write_text(traceback.format_exc());stage('blocked','构建或验证出错，正在诊断','blocked');raise
