"""Real Trapdoor12 endpoints:72 to56 tri, original faces and collider separate."""
import bpy, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import ROOT
from build_shapes import to_blender, to_unity
from build_chain18_closed_links import material, texture
from render_shapes import aim, use_preview_toon, render
from render_fence_states_phase import constant_rig
from study_trapdoor12_component_caps import actual_parts
from study_fencegate21_component_caps import face_table, covering_rectangles, covered_area
OUT=ROOT/'next_trapdoor12'
FACING=('south','west','north','east')

def obj(meta,mode,mat,name=None):
    name=name or f'TRAPDOOR12_{mode}_meta{meta:02d}'
    parts=actual_parts(meta&3,bool(meta&4),bool(meta&8));points=[];faces=[];specs=[];part_rows=[]
    for i,(part,box) in enumerate(parts):
        removed=[];kept=[]
        for f in face_table(box):
            area=covered_area(f,covering_rectangles(f,parts,i))
            if mode=='candidate' and abs(area-f['area_m2'])<1e-12:
                removed.append(f['flag']);continue
            kept.append(f['flag']);start=len(points)
            points.extend(to_blender(p) for p in f['vertices']);faces.append(tuple(range(start,start+4)))
            specs.append({'part':part,'original_face_flag':f['flag'],'normal_axis':f['axis'],
                'normal_sign':f['sign'],'UV_axes':{0:(2,1),1:(0,2),2:(0,1)}[f['axis']],
                'unity_corners':f['vertices']})
        part_rows.append({'name':part,'original_box':box,'removed_fullcap_flags':removed,
            'retained_original_face_flags':kept,'render_component_closed':not removed})
    me=bpy.data.meshes.new(name+'_mesh');me.from_pydata(points,[],faces);me.update();me.materials.append(mat)
    uv=me.uv_layers.new(name='ReviewWorld2mSurfaceUV_NOT_NATIVE_TexIdUV0')
    for poly,spec in zip(me.polygons,specs):
        poly.use_smooth=False
        for li,p in zip(poly.loop_indices,spec['unity_corners']):
            uv.data[li].uv=tuple(p[a]*.5 for a in spec['UV_axes'])
    me.calc_loop_triangles();assert len(me.loop_triangles)==(72 if mode=='raw' else 56)
    ob=bpy.data.objects.new(name,me);bpy.context.scene.collection.objects.link(ob)
    for k,v in {'shapeId_reference':12,'metadata_reference':meta,'mode':mode,'facing_reference':FACING[meta&3],
        'upper_reference':bool(meta&4),'open_reference':bool(meta&8),'logical_world_origin':[0.,0.,0.],
        'one_batched_mesh_not_renderer_per_component':True,'no_boundary_or_neighbor_caps_removed':True,
        'closed_facing_ignored':not bool(meta&8),'open_upper_ignored':bool(meta&8),
        'original_solid_sheet_collision_not_replaced':True,'render_holes_not_collision_pass':True,
        'native_integrated':False,'full_block_accepted':False,'mobile_pass':False}.items():ob[k]=v
    data={'vertices_unity':[list(to_unity(v.co)) for v in me.vertices],'faces':[list(p.vertices) for p in me.polygons],
        'triangles':[list(t.vertices) for t in me.loop_triangles],'face_normals_unity':[list(to_unity(p.normal)) for p in me.polygons],
        'face_loop_uv':[[list(uv.data[li].uv) for li in p.loop_indices] for p in me.polygons]}
    return ob,{'object_name':name,'metadata':meta,'mode':mode,'logical_world_origin':[0.,0.,0.],
        'parts':part_rows,'face_specs':specs,'actual_mesh_array_sha256':hashlib.sha256(json.dumps(data,sort_keys=True,separators=(',',':')).encode()).hexdigest(),**data}

def show(objects):
    names={o.name for o in objects}
    for ob in bpy.context.scene.objects:
        if ob.type=='MESH':ob.hide_render=ob.name not in names

def layout(objects,camera,center,cols=4,spacing=1.5):
    q=camera.rotation_euler.to_quaternion();right=q@Vector((1,0,0));up=q@Vector((0,1,0))
    rows=(len(objects)+cols-1)//cols
    for i,ob in enumerate(objects):
        local_center=Vector(tuple((min(v.co[a] for v in ob.data.vertices)+max(v.co[a] for v in ob.data.vertices))*.5 for a in range(3)))
        ob.location=Vector(center)-local_center+right*((i%cols-(cols-1)*.5)*spacing)+up*(((rows-1)*.5-i//cols)*spacing)
        ob['page_layout_transform_only']=True
        ob['page_layout_centered_on_actual_geometry_bounds']=True

def export(objects,mode):
    for ob in bpy.context.selected_objects:ob.select_set(False)
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    stem=f'iron_trapdoor12_{mode}16_endpoint_reference_atlas'
    bpy.ops.export_scene.gltf(filepath=str(OUT/'exports'/(stem+'.glb')),export_format='GLB',use_selection=True,
        export_normals=True,export_texcoords=True,export_materials='EXPORT',export_extras=True,export_tangents=False)
    if mode=='candidate':
        bpy.ops.export_scene.fbx(filepath=str(OUT/'exports'/(stem+'.fbx')),use_selection=True,object_types={'MESH'},
            axis_forward='-Z',axis_up='Y',apply_unit_scale=True,global_scale=1.,use_triangles=True,use_tspace=False,
            mesh_smooth_type='FACE',bake_anim=False,add_leaf_bones=False,use_custom_props=True,path_mode='RELATIVE')

def main():
    for sub in ('source','exports','reports','previews'):(OUT/sub).mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
    scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1.;mat=material();groups={'raw':[],'candidate':[]};rows=[]
    for mode in groups:
        for meta in range(16):
            ob,row=obj(meta,mode,mat);groups[mode].append(ob);rows.append(row)
    compare=[]
    for meta in (0,8):
        for mode in ('raw','candidate'):
            ob,row=obj(meta,mode,mat,name=f'COMPARE_trapdoor12_{mode}_meta{meta:02d}');compare.append(ob);rows.append(row)
    camera=constant_rig(scene);scene.cycles.samples=16
    scene.render.resolution_x=2048;scene.render.resolution_y=2048
    center=Vector((.5,-.5,.5));camera.location=center+Vector((3.7,4.5,3.5));camera.data.ortho_scale=6.8;aim(camera,center)
    for mode,objects in groups.items():layout(objects,camera,center);export(objects,mode)
    show(groups['candidate']);scene['scope']='Trapdoor12 real16metadata endpoint states,6occupancies,72rawto56fullybackedcaponly,3/16m fourholes;solid sheet collider unchanged.'
    scene['native_integrated']=False;scene['full_block_accepted']=False;scene['mobile_pass']=False
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source/iron_trapdoor12_internal_cap_reference.blend'),compress=True)
    (OUT/'reports/trapdoor12-actual-mesh-snapshots.json').write_text(json.dumps({'actual_state_and_comparison_meshes':rows},indent=2))
    collider=[]
    for meta in range(16):
        f=meta&3;up=bool(meta&4);opened=bool(meta&8)
        if not opened:box=((0.,.8125 if up else 0.,0.),(1.,1. if up else .1875,1.))
        elif f==0:box=((0.,0.,.8125),(1.,1.,1.))
        elif f==1:box=((0.,0.,0.),(.1875,1.,1.))
        elif f==2:box=((0.,0.,0.),(1.,1.,.1875))
        else:box=((.8125,0.,0.),(1.,1.,1.))
        collider.append({'metadata':meta,'historical_original_solid_sheet_box':box,'volume_m3':.1875,
            'four_hole_visual_union_volume_m3':.1142578125,'collision_minus_visual_volume_m3':.0732421875})
    (OUT/'reports/trapdoor12-original-solid-sheet-collider-reference.json').write_text(json.dumps({'source':'historical VoxelBlockPhysics.cs only',
        'states':collider,'actual_physics_or_interaction_run':False,'candidate_render_mesh_not_collision_replacement':True},indent=2))
    tex=use_preview_toon(mat)
    for mode,objects in groups.items():show(objects);render(scene,OUT/'previews'/f'trapdoor12_{mode}_front_raw.png')
    show(groups['candidate']);tex.image=bpy.data.images.load(str(texture('mobile_256')),check_existing=True)
    render(scene,OUT/'previews/trapdoor12_candidate_front256_raw.png')
    tex.image=bpy.data.images.load(str(texture()),check_existing=True)
    camera.location=center+Vector((-3.7,-4.5,-1.4));aim(camera,center);layout(groups['candidate'],camera,center)
    render(scene,OUT/'previews/trapdoor12_candidate_reverse_under_raw.png')
    show(compare);scene.render.resolution_x=1280;scene.render.resolution_y=1280;camera.data.ortho_scale=3.9
    camera.location=center+Vector((3.7,4.5,3.5));aim(camera,center);layout(compare,camera,center,cols=2,spacing=1.7)
    render(scene,OUT/'previews/trapdoor12_raw_candidate_closed_open_comparison_raw.png')
    report={'source_commit':'historical0956b0777cf007a7a3b1ed799f7ade777f14c80d','shapeId_reference':12,
        'actual_metadata_states':16,'distinct_occupied_patterns':6,'source_target_meshes':36,'raw_candidate_triangles':[72,56],
        'thickness_m':.1875,'candidate_whole_backed_caps_removed':8,'original_triangles_retained_without_retriangulation':True,
        'collision_sheet_unchanged_reference_only':True,'render_holes_not_physics_pass':True,
        'new_material_art_approvals':0,'finished_production_art_pass':False,'existing_iron_v02_512_sha256':hashlib.sha256(texture().read_bytes()).hexdigest(),
        'source_GLB_PBR_bridge_not_native_or_FBX_PBR_approval':True,'metal_family3_albedo_bypass_still_open':True,
        'renderer':'CyclesCPU diffuse-toon approximation','samples':16,'threads':2,
        'independent_review':'pending','native_integrated':False,'full_block_accepted':False,'mobile_pass':False,
        'artifact_sha256':{str(p.relative_to(OUT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [*sorted((OUT/'source').glob('*.blend')),*sorted((OUT/'exports').glob('*')),*sorted((OUT/'previews').glob('*raw.png'))]}}
    (OUT/'reports/trapdoor12-build-render.json').write_text(json.dumps(report,indent=2))
    print('RESULT Trapdoor12 actual16 endpoints/source36/export/render ready',flush=True)

if __name__=='__main__':main()
