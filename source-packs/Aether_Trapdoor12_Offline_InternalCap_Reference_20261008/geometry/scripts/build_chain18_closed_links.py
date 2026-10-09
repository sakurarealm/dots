"""Three axis states of96tri closed-link Chain18 components;no native/collider adapter."""
import bpy,json,sys,hashlib
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import ROOT
from build_shapes import to_blender,to_unity
from render_shapes import aim,use_preview_toon,render
from render_fence_states_phase import constant_rig
from study_chain18_closed_link_cost import boxes,ring_faces,transform
from study_fencegate21_component_caps import face_table
OUT=ROOT/'next_chain18';IRON=ROOT.parent/'materials_b/approved_standalone/iron_block_v02'
AXES={0:'Y',16:'X',32:'Z'}

def texture(res='candidate_512'):return IRON/'textures'/res/'basecolor.png'
def material():
    # Approved albedo is copied byreference;source approval library and artwork are untouched.
    mat=bpy.data.materials.new('MAT_Shared_IronV02_Offline_PBR_Bridge');mat.use_nodes=True;mat.use_backface_culling=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.7;bsdf.inputs['Metallic'].default_value=1.
    bsdf.inputs['Alpha'].default_value=1.;image=bpy.data.images.load(str(texture()),check_existing=True);image.pack();image.colorspace_settings.name='sRGB'
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;node.extension='REPEAT';node.interpolation='Linear'
    mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color']);return mat

def inverse_vector(p,metadata):
    x,y,z=p
    return (-y,x,z) if metadata==16 else (x,z,-y) if metadata==32 else (x,y,z)

def mesh_for(meta,mode,name,origin=(0,0,0)):
    canonical=[];parts=[]
    if mode=='raw':
        for i,box in enumerate(boxes()):
            fs=face_table((tuple(map(float,box[0])),tuple(map(float,box[1]))))
            canonical.extend(f['vertices'] for f in fs);parts.extend([i//4]*len(fs))
    else:
        for i in range(3):fs=ring_faces(i);canonical.extend(fs);parts.extend([i]*len(fs))
    points=[];faces=[];lookup={};specs=[];offset=inverse_vector(origin,meta)
    for f,part in zip(canonical,parts):
        f=[tuple(map(float,p)) for p in f];ids=[]
        for p in f:
            key=(part,p) #part-closed topology,not welded across touchinglinks
            if key not in lookup:lookup[key]=len(points);points.append(to_blender(transform(p,meta)))
            ids.append(lookup[key])
        faces.append(ids)
        n=(Vector(f[1])-Vector(f[0])).cross(Vector(f[2])-Vector(f[0])).normalized();a=max(range(3),key=lambda a:abs(n[a]))
        axes={0:(2,1),1:(0,2),2:(0,1)}[a]
        specs.append({'link':part,'canonical_axis':a,'canonical_sign':1 if n[a]>0 else -1,'UV_axes':axes,'canonical_corners':f})
    me=bpy.data.meshes.new(name);me.from_pydata(points,[],faces);me.update();uv=me.uv_layers.new(name='ReviewAxisRotatedWorld2m_NOT_NATIVE_TexIdUV0')
    for poly,spec in zip(me.polygons,specs):
        poly.use_smooth=False
        for li,p in zip(poly.loop_indices,spec['canonical_corners']):uv.data[li].uv=tuple((p[a]+offset[a])*.5 for a in spec['UV_axes'])
    me.calc_loop_triangles();assert len(me.loop_triangles)==(144 if mode=='raw' else 96)
    assert len(me.vertices)==(72 if mode=='raw' else 48) #raw24/link sharescorners across4boxes
    return me,specs

def obj(meta,mode,mat,origin=(0,0,0),name=None):
    name=name or f'CHAIN18_{mode}_axis{AXES[meta]}';me,specs=mesh_for(meta,mode,name+'_mesh',origin);me.materials.append(mat)
    ob=bpy.data.objects.new(name,me);bpy.context.scene.collection.objects.link(ob)
    for k,v in {'metadata_reference':meta,'axis_reference':AXES[meta],'shapeId_reference':18,'mode':mode,'reference_only':True,
        'logical_world_origin':[float(x) for x in origin],'three_individually_closed_links_NOT_welded_union':mode=='candidate',
        'one_batched_mesh_not_renderer_per_link':True,'original12collider_boxes_unchanged_reference':True,
        'native_integrated':False,'full_block_accepted':False,'mobile_pass':False}.items():ob[k]=v
    ob.location=Vector(to_blender(origin));ob['saved_logical_world_placement']=True
    data={'vertices_unity':[list(to_unity(v.co)) for v in me.vertices],'faces':[list(p.vertices) for p in me.polygons],
        'triangles':[list(t.vertices) for t in me.loop_triangles],'face_normals_unity':[list(to_unity(p.normal)) for p in me.polygons],
        'face_loop_uv':[[list(me.uv_layers[0].data[i].uv) for i in p.loop_indices] for p in me.polygons]}
    return ob,{'object_name':name,'metadata':meta,'axis':AXES[meta],'mode':mode,'logical_world_origin':origin,
        'face_specs':specs,'actual_mesh_array_sha256':hashlib.sha256(json.dumps(data,sort_keys=True,separators=(',',':')).encode()).hexdigest(),**data}

def show(objects):
    names={o.name for o in objects}
    for o in bpy.context.scene.objects:
        if o.type=='MESH':o.hide_render=o.name not in names

def layout(objects,camera,center):
    q=camera.rotation_euler.to_quaternion();right=q@Vector((1,0,0))
    for i,ob in enumerate(objects):ob.location=Vector(center)-Vector(to_blender((.5,.5,.5)))+right*((i-1)*1.45);ob['page_layout_transform_only']=True

def export(objects,mode):
    for o in bpy.context.selected_objects:o.select_set(False)
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];stem=f'iron_chain18_{mode}3_axis_reference_atlas'
    bpy.ops.export_scene.gltf(filepath=str(OUT/'exports'/(stem+'.glb')),export_format='GLB',use_selection=True,export_normals=True,
        export_texcoords=True,export_materials='EXPORT',export_extras=True,export_tangents=False)
    if mode=='candidate':bpy.ops.export_scene.fbx(filepath=str(OUT/'exports'/(stem+'.fbx')),use_selection=True,object_types={'MESH'},
        axis_forward='-Z',axis_up='Y',apply_unit_scale=True,global_scale=1.,use_triangles=True,use_tspace=False,
        mesh_smooth_type='FACE',bake_anim=False,add_leaf_bones=False,use_custom_props=True,path_mode='RELATIVE')

def main():
    for sub in ('source','exports','reports','previews'):(OUT/sub).mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1.
    mat=material();groups={'raw':[],'candidate':[]};rows=[]
    for mode in groups:
        for meta in AXES:ob,row=obj(meta,mode,mat);groups[mode].append(ob);rows.append(row)
    stack=[]
    for y in range(3):
        ob,row=obj(0,'candidate',mat,origin=(0,y,0),name=f'STACK_chain18_cellY{y}');stack.append(ob);rows.append(row)
    camera=constant_rig(scene);scene.cycles.samples=24;scene.render.resolution_x=1440;scene.render.resolution_y=640
    center=Vector((.5,-.5,.5));camera.location=center+Vector((3.5,4.5,3.));camera.data.ortho_scale=4.6;aim(camera,center)
    for mode,objects in groups.items():layout(objects,camera,center);export(objects,mode)
    show(groups['candidate']);scene['scope']='Three real chain axes:12boxraw144 vs3closedlinkparts96,onebatchedmesh/state;native/family3shader/physics/phoneopen.'
    scene['native_integrated']=False;scene['full_block_accepted']=False;scene['mobile_pass']=False
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source/iron_chain18_closed_link_reference.blend'),compress=True)
    (OUT/'reports/chain18-actual-mesh-snapshots.json').write_text(json.dumps({'actual_axis_and_stack_meshes':rows},indent=2))
    refs=[]
    for meta in AXES:
        bounds=[]
        for lo,hi in boxes():
            a,b=transform(lo,meta),transform(hi,meta);bounds.append([[float(min(a[i],b[i])) for i in range(3)],[float(max(a[i],b[i])) for i in range(3)]])
        refs.append({'metadata':meta,'axis':AXES[meta],'original12compound_box_bounds':bounds})
    (OUT/'reports/chain18-original-compound-box-reference.json').write_text(json.dumps({'source_state':'historical0956b077',
        'cases':refs,'actual_collision_or_movement_test':False,'closed_visual_links_NOT_physics_approval':True},indent=2))
    tex=use_preview_toon(mat)
    for mode,objects in groups.items():show(objects);render(scene,OUT/'previews'/f'chain18_{mode}_front_raw.png')
    show(groups['candidate']);tex.image=bpy.data.images.load(str(texture('mobile_256')),check_existing=True)
    render(scene,OUT/'previews/chain18_candidate_front256_raw.png');tex.image=bpy.data.images.load(str(texture()),check_existing=True)
    camera.location=center+Vector((-3.5,-4.5,.8));aim(camera,center);layout(groups['candidate'],camera,center)
    render(scene,OUT/'previews/chain18_candidate_back_raw.png')
    show(stack);scene.render.resolution_x=640;scene.render.resolution_y=1080;camera.data.ortho_scale=3.7
    camera.location=(3.8,4.5,2.7);aim(camera,(.5,-.5,1.5));render(scene,OUT/'previews/chain18_vertical3_world_phase_raw.png')
    report={'scope':'Catalogbacked Chain18 threeaxis offlineclosedlink reference','historical_commit':'0956b077','actual_source_meshes':9,
        'raw_candidate_triangles_per_cell':[144,96],'three_closed_parts_not_welded_union':True,'per_link_renderer_design':False,
        'residual_interlink_buried_cap_area_m2':.015625,'original12box_collision_reference_unchanged':True,
        'existing_iron_v02_artwork_unchanged':True,'512map_sha256':hashlib.sha256(texture().read_bytes()).hexdigest(),
        'iron_family3_historical_shader_bypasses_albedo':True,'native_shader_tint_atlas_UV0_unverified':True,
        'renderer':'CyclesCPU diffuse-toon approximation','samples':24,'threads':2,'independent_review':'pending',
        'native_integrated':False,'full_block_accepted':False,'mobile_pass':False,
        'artifact_sha256':{str(p.relative_to(OUT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [*sorted((OUT/'source').glob('*.blend')),*sorted((OUT/'exports').glob('*')),*sorted((OUT/'previews').glob('*raw.png'))]}}
    (OUT/'reports/chain18-build-render.json').write_text(json.dumps(report,indent=2));print('RESULT chain18 threeaxes144to96+3cellphase ready',flush=True)
if __name__=='__main__':main()
