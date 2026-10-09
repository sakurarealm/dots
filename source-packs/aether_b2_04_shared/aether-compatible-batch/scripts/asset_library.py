"""Original Aether town sample generator. Tested against cloud Blender 4.3.2.

No repository edits, third-party source geometry, or external texture assets.
Run: blender-aether -b --factory-startup --threads 2 --python-exit-code 1 -P build_samples.py
"""
import bpy
import bmesh
import numpy as np
from math import pi, sin, cos
from mathutils import Vector, Matrix
from pathlib import Path
import json, math, sys, time, hashlib

ROOT = Path(__file__).resolve().parents[1]
TEX = ROOT / 'textures'
IDS = ()

def srgb_linear(v):
    a=np.asarray(v,dtype=np.float32)
    return np.where(a<=0.04045,a/12.92,((a+0.055)/1.055)**2.4)

def image_file(name, values, data=False):
    h,w,_=values.shape
    image=bpy.data.images.new(name,width=w,height=h,alpha=True)
    image.colorspace_settings.name='Non-Color' if data else 'sRGB'
    vals=values.astype(np.float32)
    # Generated images save their written sRGB channel values directly in this
    # Blender build. Linearizing here would bake a second darkening into the PNG.
    # Reloading the PNG below gives image texture nodes the normal sRGB decoding.
    image.pixels.foreach_set(vals.ravel())
    image.filepath_raw=str(TEX/(name+'.png'));image.file_format='PNG';image.save()
    # Reload the actual exported PNG, then pack it. This also validates the byte route.
    bpy.data.images.remove(image)
    image=bpy.data.images.load(str(TEX/(name+'.png')),check_existing=True)
    image.colorspace_settings.name='Non-Color' if data else 'sRGB';image.pack()
    return image

def textures():
    # Deliberately low-frequency, hand-painted-style directional strokes.
    # These are shared maps across all three assets, not copied reference pixels.
    n=512;y,x=np.mgrid[0:n,0:n].astype(np.float32)/n
    # Four broad warm-wood palette lanes and one dark-cap lane. UVs select a
    # lane per part; this keeps trim darker without adding a material slot.
    lane=np.minimum((x/.18).astype(np.int32),3)
    u=(x-lane*.18)/.18
    dark=x>=.76
    u=np.where(dark,(x-.76)/.24,u)
    strokes=.055*np.sin(2*pi*(u*1.45+.10*np.sin(2*pi*y)))
    strokes+=.020*np.cos(2*pi*(u*2.35+.08*np.sin(2*pi*y*1.5)))
    wash=.045*np.cos(pi*(y-.16))+.022*np.sin(2*pi*(y*.7+u*.24))
    # A soft, long irregular brush patch, not repeating thin grooves.
    patch=np.exp(-((u-.48-.08*np.sin(2*pi*y))/ .20)**2)*np.exp(-((y-.53)/.36)**2)
    wood=strokes+wash-.027*patch
    variation=np.take(np.array([-.045,.035,-.005,.065]),lane)
    shade=np.where(dark,.66,1.+variation)
    wrgb=np.stack([(.605+wood)*shade,(.425+wood*.78)*shade,(.282+wood*.54)*shade],axis=-1)
    cloth=.020*np.sin(2*pi*(x*2.0+.08*np.sin(2*pi*y)))+.015*np.cos(pi*y)
    crgb=np.stack([.32+cloth,.48+cloth,.36+cloth],axis=-1)
    metal=.017*np.sin(2*pi*x*1.5)+.012*np.cos(pi*y)
    mrgb=np.stack([.63+metal,.53+metal,.36+metal],axis=-1)
    mats={}
    for name,rgb,rough,metallic,height in [('MAT_Wood_Warm',wrgb,.82,0.,wood*.00065),('MAT_Cloth_Canvas',crgb,.95,0.,cloth*.0008),('MAT_Metal_Brass',mrgb,.48,.72,metal*.0003)]:
        rgba=np.ones((n,n,4),np.float32);rgba[:,:,:3]=np.clip(rgb,0,1)
        bc=image_file(name.replace('MAT_','T_')+'_BaseColor',rgba)
        dx=(np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))*n/2
        dy=(np.roll(height,-1,axis=0)-np.roll(height,1,axis=0))*n/2
        norm=np.stack([-dx,-dy,np.ones_like(dx)],axis=-1);norm/=np.linalg.norm(norm,axis=-1,keepdims=True)
        nr=np.ones((n,n,4),np.float32);nr[:,:,:3]=norm*.5+.5
        nm=image_file(name.replace('MAT_','T_')+'_NormalGL',nr,True)
        rm=np.ones((n,n,4),np.float32);rm[:,:,:3]=rough
        roughim=image_file(name.replace('MAT_','T_')+'_Roughness',rm,True)
        # HDRP convention: R metallic, G AO, B detail mask, A smoothness.
        mask=np.ones((n,n,4),np.float32);mask[:,:,0]=metallic;mask[:,:,1]=1;mask[:,:,2]=1;mask[:,:,3]=1-rough
        image_file(name.replace('MAT_','T_')+'_MaskMap',mask,True)
        mat=bpy.data.materials.new(name);mat.use_nodes=True
        mat.diffuse_color=(*srgb_linear(np.mean(rgb,axis=(0,1))),1.)
        bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metallic
        bs.inputs['Specular IOR Level'].default_value=.25 if metallic==0 else .5
        nt=mat.node_tree;t=nt.nodes.new('ShaderNodeTexImage');t.image=bc;nt.links.new(t.outputs['Color'],bs.inputs['Base Color'])
        t=nt.nodes.new('ShaderNodeTexImage');t.image=nm;t.name='NormalGL_source';nn=nt.nodes.new('ShaderNodeNormalMap');nn.inputs['Strength'].default_value=.35;nt.links.new(t.outputs['Color'],nn.inputs['Color']);nt.links.new(nn.outputs['Normal'],bs.inputs['Normal'])
        t=nt.nodes.new('ShaderNodeTexImage');t.image=roughim;nt.links.new(t.outputs['Color'],bs.inputs['Roughness'])
        mat['aether_role']='shared_prototype_family';mat['aether_emission']=False
        mat['aether_shader_note']='Preview Principled bridge only; Unity stylized shader binding not yet verified.'
        mats[name]=mat
    return mats

def mesh_object(name, verts, faces, mat, parent=None, grain=0):
    me=bpy.data.meshes.new(name+'_Mesh');me.from_pydata(verts,[],faces);me.update()
    assert not me.validate(),name
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
    ob=bpy.data.objects.new(name,me);bpy.context.scene.collection.objects.link(ob)
    if parent:ob.parent=parent
    if mat:me.materials.append(mat)
    # Lengthwise grain direction is assigned per part before placement/rotation.
    uv=me.uv_layers.new(name='UVMap')
    ext=np.array([max(v[i] for v in verts)-min(v[i] for v in verts) for i in range(3)])
    minor=[i for i in range(3) if i!=grain]
    for p in me.polygons:
        axis=max(range(3),key=lambda i:abs(p.normal[i]))
        if axis==grain:
            uaxis,vaxis=minor
        else:
            uaxis=next(i for i in minor if i!=axis);vaxis=grain
        for li in p.loop_indices:
            co=me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv=((co[uaxis]/max(ext[uaxis],.01))+.5,(co[vaxis]/max(ext[vaxis],.01))+.5)
    for p in me.polygons:p.use_smooth=False
    ob['aether_generated']=True
    return ob

def repair_uv(me):
    uv=me.uv_layers.active;fixed=0
    for p in me.polygons:
        points=[uv.data[i].uv.copy() for i in p.loop_indices];area=0.
        for i in range(1,len(points)-1):
            a=points[i]-points[0];b=points[i+1]-points[0];area+=abs(a.x*b.y-a.y*b.x)/2
        if area>1e-10:continue
        # Small chamfer triangles can inherit collapsed UVs. Give them an actual
        # planar projection without modifying geometry or adding a material.
        axis=max(range(3),key=lambda i:abs(p.normal[i]));axes=[i for i in range(3) if i!=axis]
        coords=[me.vertices[me.loops[i].vertex_index].co for i in p.loop_indices]
        for li,co in zip(p.loop_indices,coords):uv.data[li].uv=(co[axes[0]]*2+.5,co[axes[1]]*2+.5)
        fixed+=1
    return fixed

def remove_flat_components(me):
    bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table();seen=set();remove=[]
    for first in bm.faces:
        if first.index in seen:continue
        todo=[first];comp=[]
        while todo:
            f=todo.pop()
            if f.index in seen:continue
            seen.add(f.index);comp.append(f)
            for e in f.edges:todo.extend(a for a in e.link_faces if a.index not in seen)
        vol=0.
        for f in comp:
            v=[a.co for a in f.verts]
            for i in range(1,len(v)-1):vol+=v[0].dot(v[i].cross(v[i+1]))/6
        if abs(vol)<=1e-12:remove.extend({v for f in comp for v in f.verts})
    if remove:bmesh.ops.delete(bm,geom=remove,context='VERTS')
    bm.to_mesh(me);bm.free();return len(remove)

def wood_palette_uv(ob, dark=False):
    if not ob.data.materials or ob.data.materials[0].name!='MAT_Wood_Warm':return
    index=int(hashlib.sha256(ob.name.encode()).hexdigest()[:8],16)%4
    for loop in ob.data.uv_layers.active.data:
        u,v=loop.uv
        # Original coordinates describe one part rather than texture tiling.
        u=max(0.,min(1.,u));v=max(0.,min(1.,v))
        loop.uv=(.774+u*.212 if dark else index*.18+.012+u*.156,.014+v*.972)
    ob['aether_palette_lane']='dark_cap' if dark else index


def cube(name,center,dims,mat,parent=None,bevel=.006,rotation=None,dark=False):
    hx,hy,hz=[a/2 for a in dims]
    vs=[(-hx,-hy,-hz),(hx,-hy,-hz),(hx,hy,-hz),(-hx,hy,-hz),(-hx,-hy,hz),(hx,-hy,hz),(hx,hy,hz),(-hx,hy,hz)]
    fs=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    ob=mesh_object(name,vs,fs,mat,parent,max(range(3),key=lambda i:dims[i]));ob.location=center
    if rotation:ob.rotation_euler=rotation
    if bevel:
        mod=ob.modifiers.new('Craft_edge_chamfer','BEVEL');mod.width=min(bevel,min(dims)*.18);mod.segments=1
        mod.affect='EDGES'
        bpy.context.view_layer.objects.active=ob;ob.select_set(True)
        bpy.ops.object.modifier_apply(modifier=mod.name);ob.select_set(False)
    repair_uv(ob.data)
    wood_palette_uv(ob, dark or name.startswith('roof_') and 'cap' in name or name=='frame_ridge')
    return ob

def cylinder(name,center,radius,length,mat,parent=None,vertices=12,axis='Z'):
    verts=[]
    for z in [-length/2,length/2]:
        for i in range(vertices):
            a=2*pi*i/vertices;verts.append((radius*cos(a),radius*sin(a),z))
    faces=[tuple(range(vertices-1,-1,-1)),tuple(range(vertices,vertices*2))]
    faces.extend((i,(i+1)%vertices,(i+1)%vertices+vertices,i+vertices) for i in range(vertices))
    ob=mesh_object(name,verts,faces,mat,parent,2);ob.location=center
    if axis=='X':ob.rotation_euler[1]=pi/2
    if axis=='Y':ob.rotation_euler[0]=pi/2
    wood_palette_uv(ob)
    return ob

def beam(name,a,b,width,depth,mat,parent):
    d=Vector(b)-Vector(a);ob=cube(name,(Vector(a)+Vector(b))/2,(width,depth,d.length),mat,parent,.008)
    # Preserve global Y as depth for all XZ-plane structural members.
    # to_track_quat's world-up convention would silently rotate depth into width.
    z=d.normalized();ref=Vector((0,1,0))
    if abs(z.dot(ref))>.99:ref=Vector((1,0,0))
    x=ref.cross(z).normalized();y=z.cross(x).normalized()
    ob.rotation_euler=Matrix((x,y,z)).transposed().to_euler();return ob

def empty(name,parent=None,loc=(0,0,0)):
    ob=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(ob);ob.location=loc
    if parent:ob.parent=parent
    ob.empty_display_type='PLAIN_AXES';ob.empty_display_size=.12
    return ob

def join_baked(parts,name,parent,keep_source=True):
    bpy.context.view_layer.update();verts=[];faces=[];mat_ids=[];uvs=[];mats=[]
    inv=parent.matrix_world.inverted()
    # Keep editable, individually named construction pieces in the source file.
    # Runtime LOD meshes are batched separately for bounded renderer count.
    if keep_source:
        source_root=empty('SOURCE_PARTS',parent);source_root['aether_source_only']=True
        for ob in parts:
            cp=bpy.data.objects.new('SOURCE_'+ob.name,ob.data.copy());bpy.context.scene.collection.objects.link(cp)
            cp.parent=source_root;cp.matrix_basis=ob.matrix_basis.copy();cp.hide_render=True;cp.hide_set(True);cp['aether_source_piece']=True
    for ob in parts:
        m=ob.data;t=inv@ob.matrix_world;off=len(verts)
        verts.extend(tuple(t@v.co) for v in m.vertices)
        localm=[]
        for mat in m.materials:
            if mat not in mats:mats.append(mat)
            localm.append(mats.index(mat))
        for p in m.polygons:
            faces.append(tuple(v+off for v in p.vertices));mat_ids.append(localm[p.material_index] if localm else 0)
            uvs.extend(tuple(m.uv_layers.active.data[li].uv) for li in p.loop_indices)
    obj=mesh_object(name,verts,faces,None,parent);obj.data.materials.clear()
    for mat in mats:obj.data.materials.append(mat)
    for p,mi in zip(obj.data.polygons,mat_ids):p.material_index=mi
    for li,uv in enumerate(uvs):obj.data.uv_layers.active.data[li].uv=uv
    for ob in parts:bpy.data.objects.remove(ob,do_unlink=True)
    # All render meshes are explicitly triangulated, keeping LOD measurement exact.
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.triangulate(bm,faces=bm.faces);bm.to_mesh(obj.data);bm.free();repair_uv(obj.data)
    return obj

def subset_mesh(ob,polygons,name,parent):
    verts=[];faces=[];indices=[];uvs=[];mapping={}
    for p in polygons:
        face=[]
        for vi in p.vertices:
            if vi not in mapping:mapping[vi]=len(verts);verts.append(tuple(ob.data.vertices[vi].co))
            face.append(mapping[vi])
        faces.append(tuple(face));indices.append(p.material_index)
        uvs.extend(tuple(ob.data.uv_layers.active.data[li].uv) for li in p.loop_indices)
    cp=mesh_object(name,verts,faces,None,parent)
    for m in ob.data.materials:cp.data.materials.append(m)
    for p,mi in zip(cp.data.polygons,indices):p.material_index=mi
    for li,uv in enumerate(uvs):cp.data.uv_layers.active.data[li].uv=uv
    return cp

def add_lods(ob,parent):
    lods=[ob]
    for i,ratio in [(1,.52),(2,.25)]:
        # Protect the visible metal nodes and identifying canvas from collapse.
        # Simplification applies only to the wooden assembly; it never erases
        # tiny disconnected pins and connection plates just to meet a ratio.
        wood=[p for p in ob.data.polygons if ob.data.materials[p.material_index].name=='MAT_Wood_Warm']
        retained=[p for p in ob.data.polygons if ob.data.materials[p.material_index].name!='MAT_Wood_Warm']
        cp=subset_mesh(ob,wood,'LOD_TMP_Wood',parent)
        mod=cp.modifiers.new('LOD_Wood_simplification','DECIMATE');mod.ratio=ratio;mod.use_collapse_triangulate=True
        bpy.context.view_layer.objects.active=cp;cp.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name);cp.select_set(False)
        bm=bmesh.new();bm.from_mesh(cp.data);bmesh.ops.triangulate(bm,faces=bm.faces);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(cp.data);bm.free()
        removed=remove_flat_components(cp.data);repair_uv(cp.data)
        keep=subset_mesh(ob,retained,'LOD_TMP_RetainedNodes',parent)
        combined=join_baked([cp,keep],ob.name.replace('LOD0','LOD'+str(i)),parent,keep_source=False)
        combined['aether_removed_flat_lod_vertices']=removed
        combined['aether_lod_ratio_target_wood']=ratio
        combined['aether_retained_hardware_and_canvas_triangles']=len(retained)
        combined.hide_render=True;lods.append(combined)
    return lods

def collider(name,center,dims,parent):
    o=cube(name,center,dims,None,parent,0);o.hide_render=True;o.display_type='WIRE';o['aether_collider']='box_proxy'
    return o

def bounds(objects):
    bpy.context.view_layer.update();vs=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
    lo=[min(v[i] for v in vs) for i in range(3)];hi=[max(v[i] for v in vs) for i in range(3)]
    return {'min':lo,'max':hi,'dimensions':[hi[i]-lo[i] for i in range(3)]}

def audit(objects):
    records=[]
    for ob in objects:
        me=ob.data;bm=bmesh.new();bm.from_mesh(me);bm.normal_update()
        r={'name':ob.name,'vertices':len(me.vertices),'triangles':sum(len(p.vertices)-2 for p in me.polygons),'material_slots':len(me.materials),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'loose_vertices':sum(not v.link_faces for v in bm.verts),'zero_area_faces':sum(f.calc_area()<1e-10 for f in bm.faces),'finite_coordinates':all(math.isfinite(v) for p in me.vertices for v in p.co),'uv_layers':len(me.uv_layers),'flat_faces':sum(not p.use_smooth for p in me.polygons),'scale':list(ob.scale)}
        # Closed components must have positive signed volume after normal recalculation.
        r['signed_volume_m3']=bm.calc_volume(signed=True);bm.free();records.append(r)
    return records

def export(root,lods,moves,cols,anchors):
    out=ROOT/'exports'/root.name;out.mkdir(parents=True,exist_ok=True)
    # Full FBX: three LODs, collision proxies, pivots and anchors. Unity binding is explicit, not automatic.
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [root]+list(root.children_recursive):
        if not ob.get('aether_source_piece') and not ob.get('aether_source_only'):ob.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.fbx(filepath=str(out/(root.name+'.fbx')),use_selection=True,global_scale=1.,apply_unit_scale=True,apply_scale_options='FBX_SCALE_UNITS',axis_forward='-Z',axis_up='Y',bake_space_transform=False,object_types={'MESH','EMPTY'},use_mesh_modifiers=True,mesh_smooth_type='FACE',add_leaf_bones=False,bake_anim=False,path_mode='COPY',embed_textures=True,use_custom_props=True)
    # GLB is a clean LOD0 review artifact. Collision/LOD alternatives never overlap in it.
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [root,lods[0]]+moves:ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out/(root.name+'.glb')),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_apply=True,export_image_format='AUTO',export_normals=True,export_texcoords=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
    return out

