"""Build exact silhouette masters and coplanar-reduced mobile candidates in Blender 4.3.2."""
import bpy, bmesh, json, sys, math, shutil, resource, hashlib
from pathlib import Path
from collections import Counter
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import ROOT, REPRESENTATIVES, cell_shell, run_contracts

MATERIAL_ROOT=ROOT.parent/'materials_a'/'textures'
MATERIAL_ROOTS={'stone_bricks':ROOT.parent/'materials_a'/'candidates'/'v05'/'textures'}

def texture_path(family,resolution='candidate_512'):
    return MATERIAL_ROOTS.get(family,MATERIAL_ROOT)/family/resolution/'basecolor.png'

def to_blender(p): return (p[0],-p[2],p[1])
def to_unity(p): return (p[0],p[2],-p[1])

def material_for(family):
    mat=bpy.data.materials.get('MAT_Block_'+family) or bpy.data.materials.new('MAT_Block_'+family)
    mat.use_nodes=True
    mat.use_backface_culling=True
    nt=mat.node_tree
    bsdf=nt.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value={'stone':.9,'stone_bricks':.8,'oak_planks':.7}[family]
    bsdf.inputs['Metallic'].default_value=0.
    bsdf.inputs['Specular IOR Level'].default_value=.08
    texture=texture_path(family)
    if not texture.is_file(): raise RuntimeError('Shared texture not ready: '+str(texture))
    img=bpy.data.images.load(str(texture),check_existing=True)
    img.colorspace_settings.name='sRGB'
    img.pack()
    node=nt.nodes.new('ShaderNodeTexImage');node.image=img
    node.extension='REPEAT';node.interpolation='Linear'
    nt.links.new(node.outputs['Color'],bsdf.inputs['Base Color'])
    return mat

def add_review_uv(mesh,native_index,family):
    uv=mesh.uv_layers.new(name='ReviewUV_2mRepeat_RailDirectional')
    encoded=mesh.uv_layers.new(name='Historical_UV0_texId_DO_NOT_BIND')
    for poly in mesh.polygons:
        axis=max(range(3),key=lambda a:abs(to_unity(poly.normal)[a]))
        axes=(2,1) if axis==0 else (0,2) if axis==1 else (0,1)
        coords=[to_unity(mesh.vertices[mesh.loops[li].vertex_index].co) for li in poly.loop_indices]
        center=[sum(p[a] for p in coords)/len(coords) for a in range(3)]
        # Review-only grain direction: preserve UV seams around rail-to-post joins.
        # Native world-triplanar currently does not have this per-part direction.
        rail_x=family=='oak_planks' and (center[0]<.375-1e-6 or center[0]>.625+1e-6)
        rail_z=family=='oak_planks' and (center[2]<.375-1e-6 or center[2]>.625+1e-6)
        if rail_x and axis!=0: axes=(2,0) if axis==1 else (1,0)
        if rail_z and axis!=2: axes=(0,2) if axis==1 else (1,2)
        for li in poly.loop_indices:
            p=to_unity(mesh.vertices[mesh.loops[li].vertex_index].co)
            uv.data[li].uv=(p[axes[0]]*.5,p[axes[1]]*.5)
            encoded.data[li].uv=(native_index,0.)
    mesh.uv_layers.active=uv

def audit(mesh,shell):
    mesh.calc_loop_triangles()
    bm=bmesh.new();bm.from_mesh(mesh);bm.normal_update()
    area=sum(f.calc_area() for f in bm.faces)
    volume=bm.calc_volume(signed=True)
    non_manifold=sum(not e.is_manifold for e in bm.edges)
    degenerate=sum(f.calc_area()<1e-10 for f in bm.faces)
    normals_bad=0
    # All surfaces of a rectangular union are axis-aligned; no smoothing or bevel inflation.
    for f in bm.faces:
        if max(abs(v) for v in f.normal)<.99999: normals_bad+=1
    bm.free()
    assert abs(area-shell['surface_area_m2'])<1e-6,(area,shell['surface_area_m2'])
    assert abs(volume-shell['volume_m3'])<1e-6,(volume,shell['volume_m3'])
    assert not(non_manifold or degenerate or normals_bad),(non_manifold,degenerate,normals_bad)
    split_keys=set()
    uv=mesh.uv_layers[0]
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            p=mesh.vertices[mesh.loops[li].vertex_index].co
            key=tuple(round(x,7) for x in (*p,*poly.normal,*uv.data[li].uv))
            split_keys.add(key)
    tri=len(mesh.loop_triangles);gpu=len(split_keys)
    uv_lo=[min(float(d.uv[a]) for d in uv.data) for a in range(2)]
    uv_hi=[max(float(d.uv[a]) for d in uv.data) for a in range(2)]
    assert all(0 <= v <= 1 for v in uv_lo+uv_hi),(uv_lo,uv_hi)
    return {'triangles':tri,'geometric_vertices':len(mesh.vertices),'gpu_split_vertices_estimate':gpu,
            'polygons_authoring':len(mesh.polygons),'material_slots':len(mesh.materials),'submeshes':1,
            'uv_sets':len(mesh.uv_layers),'review_uv_bounds':[uv_lo,uv_hi],
            'indexed_mesh_bytes_position_normal_uv_uint16':gpu*32+tri*3*2,
            'indexed_mesh_bytes_with_tangent_uint16':gpu*48+tri*3*2,
            'indexed_mesh_bytes_export_two_uv_uint16':gpu*40+tri*3*2,
            'indexed_mesh_bytes_export_two_uv_tangent_uint16':gpu*56+tri*3*2,
            'triangle_stream_bytes_position_normal_uv':tri*3*32,
            'volume_m3':volume,'surface_area_m2':area,'non_manifold_edges':non_manifold,
            'degenerate_faces':degenerate,'non_axis_aligned_normals':normals_bad,
            'bounds_unity':[[min(to_unity(v.co)[a] for v in mesh.vertices) for a in range(3)],
                            [max(to_unity(v.co)[a] for v in mesh.vertices) for a in range(3)]]}

def select_only(ob):
    for o in bpy.context.selected_objects: o.select_set(False)
    ob.hide_set(False);ob.select_set(True);bpy.context.view_layer.objects.active=ob

def create_asset(spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1.
    scene.render.threads_mode='FIXED';scene.render.threads=2
    mat=material_for(spec['family'])
    shell=cell_shell(spec['boxes'],spacing=.25)
    master_mesh=bpy.data.meshes.new('MasterEditGrid')
    master_mesh.from_pydata([to_blender(p) for p in shell['vertices_unity']],[],shell['faces'])
    assert not master_mesh.validate(verbose=True)
    master_mesh.update()
    add_review_uv(master_mesh,spec['bk_index'],spec['family'])
    opt_mesh=master_mesh.copy();opt_mesh.name='ExactUnionCoplanarReduced'
    bm=bmesh.new();bm.from_mesh(opt_mesh);bm.normal_update()
    uv_layer=bm.loops.layers.uv.get('ReviewUV_2mRepeat_RailDirectional')
    for e in bm.edges:
        if len(e.link_faces)!=2:continue
        uv_pair=[]
        for f in e.link_faces:
            uv_pair.append({l.vert:tuple(l[uv_layer].uv) for l in f.loops if l.vert in e.verts})
        e.seam=any(any(abs(uv_pair[0][v][a]-uv_pair[1][v][a])>1e-6 for a in range(2)) for v in e.verts)
    # The angle threshold protects geometric creases. NORMAL delimiter also
    # protects every flat-shaded quad in Blender 4.3, which prevents reduction.
    print('PLANAR_INPUT',spec['asset'],len(bm.faces),'seams',sum(e.seam for e in bm.edges),flush=True)
    planar_edges=[e for e in bm.edges if len(e.link_faces)==2 and not e.seam and
                  e.link_faces[0].normal.dot(e.link_faces[1].normal)>.999999]
    if planar_edges:bmesh.ops.dissolve_edges(bm,edges=planar_edges,use_verts=True,use_face_split=False)
    # After plane merging, authoring-grid points on a straight crease have
    # degree two. Remove those without changing a corner or UV direction join.
    straight=[]
    for v in bm.verts:
        if len(v.link_edges)!=2:continue
        directions=[(e.other_vert(v).co-v.co).normalized() for e in v.link_edges]
        if directions[0].dot(directions[1]) < -.999999:straight.append(v)
    if straight:bmesh.ops.dissolve_verts(bm,verts=straight,use_face_split=False,use_boundary_tear=False)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:]);bm.to_mesh(opt_mesh);bm.free()
    opt_mesh.update()
    # Safe second optimization: explanatory historical texId is already in the
    # mapping manifest. It does not need an extra eight-byte per-vertex UV stream.
    encoded=opt_mesh.uv_layers.get('Historical_UV0_texId_DO_NOT_BIND')
    if encoded:opt_mesh.uv_layers.remove(encoded)
    objects=[];metrics={}
    for stage,mesh in (('MASTER',master_mesh),('OPT',opt_mesh)):
        ob=bpy.data.objects.new(stage+'_'+spec['asset'],mesh);scene.collection.objects.link(ob)
        ob['asset_kind']='Chunk geometry review reference; not prefab replacement'
        ob['source_commit']='historical 0956b077'
        ob['shapeId']=spec['shapeId'];ob['BK_texId']=spec['bk_index'];ob['atlas_tile']=spec['atlas_tile']
        ob['stage']=stage;ob['mobile_verified']=False
        mesh.materials.append(mat)
        for p in mesh.polygons: p.use_smooth=False
        metrics[stage.lower()]=audit(mesh,shell)
        ob.hide_render=stage=='MASTER'
        if stage=='MASTER': ob.hide_set(True)
        objects.append(ob)
    print('REDUCTION_AUDIT',spec['asset'],metrics['master'],metrics['opt'],flush=True)
    assert metrics['opt']['triangles']<metrics['master']['triangles']
    output=ROOT/'exports';output.mkdir(exist_ok=True)
    canonical={'asset':spec['asset'],'reference_only':True,'source_state':'historical',
       'shapeId':spec['shapeId'],'metadata':spec['metadata'],'state':spec['state'],
       'texture_family':spec['family'],'historical_texId':spec['bk_index'],
       'origin':'cell minimum corner','units':'meters','axis':'Unity XYZ Y-up',
       'vertices':[list(to_unity(v.co)) for v in opt_mesh.vertices],
       'faces':[list(p.vertices) for p in opt_mesh.polygons],
       'native_chunk_uv0_contract':[spec['bk_index'],0],
       'no_per_voxel_renderer_or_prefab':True}
    (output/(spec['asset']+'_reference_mesh_unity.json')).write_text(json.dumps(canonical,indent=2))
    for stage,ob in zip(('master','mobile_candidate'),objects):
        select_only(ob)
        fbx=output/(spec['asset']+'_'+stage+'.fbx')
        bpy.ops.export_scene.fbx(filepath=str(fbx),use_selection=True,object_types={'MESH'},
            axis_forward='-Z',axis_up='Y',apply_unit_scale=True,global_scale=1.,
            bake_space_transform=False,use_mesh_modifiers=True,use_triangles=True,
            use_tspace=True,mesh_smooth_type='FACE',add_leaf_bones=False,bake_anim=False,
            path_mode='RELATIVE')
        if stage=='mobile_candidate':
            glb=output/(spec['asset']+'_mobile_candidate.glb')
            bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
                export_texcoords=True,export_normals=True,export_tangents=False,export_materials='EXPORT')
    for ob in objects:
        ob.select_set(False);ob.hide_render=ob.get('stage')=='MASTER'
        ob.hide_set(ob.get('stage')=='MASTER')
    objects[1].select_set(True);bpy.context.view_layer.objects.active=objects[1]
    scene['review_only']=True;scene['no_mobile_runtime_test']=True
    scene['origin_contract']='Cell minimum corner; Blender=(UnityX,-UnityZ,UnityY), 1m cell'
    bpy.context.view_layer.update()
    blend=ROOT/'source'/(spec['asset']+'_master_and_candidate.blend')
    bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
    result={'asset':spec['asset'],'state':spec['state'],'historical_shapeId':spec['shapeId'],
       'family':spec['family'],'shared_texture':str(texture_path(spec['family'])),
       'basecolor_sha256':hashlib.sha256(texture_path(spec['family']).read_bytes()).hexdigest(),
       'material_candidate_revision':'v05' if spec['family']=='stone_bricks' else 'v02',
       'material_art_status':'blocked_not_accepted' if spec['family']=='stone' else 'standalone_material_review_passed_awaiting_shape_composite_review',
       'source_blend_basecolor_packed':True,
       'source_commit':'0956b0777cf007a7a3b1ed799f7ade777f14c80d','source_state':'historical',
       'native_box_baseline':{'boxes':len(spec['boxes']),'triangles':len(spec['boxes'])*12,
                              'triangle_stream_vertices':len(spec['boxes'])*36,
                              'position_normal_uv_bytes':len(spec['boxes'])*36*32},
       **metrics,'reduction_percent':round(100*(1-metrics['opt']['triangles']/metrics['master']['triangles']),2),
       'reduction_method':'Planar dissolve of editable exterior authoring-grid faces, preserving normal and UV direction seams; exact silhouette retained. Native historical box baseline is separate.',
       'review_repeat_meters':2.,'native_uv_compatible':False,
       'second_optimization':'Remove unused explanatory historical UV1 stream from reduced candidate; preserve native texture index in mapping manifest. Save 8 bytes per GPU split vertex.',
       'discarded_triangle_optimization':{'requested_triangles':76,'result':'rejected_by_surface_area_gate',
           'reason':'BMesh vertex dissolve changed the boundary of planar faces with holes; retain correct 84-triangle fence'},
       'fence_directional_uv_native_shader_supported':False if spec['family']=='oak_planks' else None,
       'candidate_status':'awaiting_visual_and_independent_review','mobile_pass':False,
       'unity_import_verified':False,'blender_version':bpy.app.version_string,
       'files':{str(p.relative_to(ROOT)):p.stat().st_size for p in [blend,*output.glob(spec['asset']+'*')]}}
    (ROOT/'reports'/(spec['asset']+'_audit.json')).write_text(json.dumps(result,indent=2))
    print('ASSET_BUILT',spec['asset'],metrics['master']['triangles'],'->',metrics['opt']['triangles'],flush=True)
    return result

def main():
    assert bpy.app.version[:2]==(4,3),bpy.app.version_string
    ROOT.mkdir(exist_ok=True)
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    specs=[s for s in REPRESENTATIVES if not args or s['asset'] in args]
    results=[create_asset(s) for s in specs]
    target=ROOT/'reports'/'geometry-build-audit.json'
    previous=json.loads(target.read_text()) if target.exists() else []
    combined={x['asset']:x for x in previous};combined.update({x['asset']:x for x in results})
    target.write_text(json.dumps(list(combined.values()),indent=2))
    print('RESULT '+json.dumps({'status':'build_and_export_complete','assets':len(results),
      'peak_rss_kib':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,'mobile_pass':False}),flush=True)

if __name__=='__main__':main()
