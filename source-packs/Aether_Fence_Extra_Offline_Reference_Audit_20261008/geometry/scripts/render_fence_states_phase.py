"""16 derived states and local/world UV comparisons; a Blender reference, never engine proof."""
import bpy,json,sys,math,hashlib
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import ROOT,fence
from validate_state_meshes import optimized_state
from build_shapes import material_for,to_unity,to_blender,texture_path
from render_shapes import rig,aim,use_preview_toon,render
from world_uv_reference import uv,part_axis,run_contracts

def reference_uv(mesh,origin,mode):
    layer=mesh.uv_layers[0]
    for poly in mesh.polygons:
        normal=to_unity(poly.normal);axis=max(range(3),key=lambda a:abs(normal[a]))
        ps=[to_unity(mesh.vertices[mesh.loops[i].vertex_index].co) for i in poly.loop_indices]
        center=[sum(p[a] for p in ps)/len(ps) for a in range(3)]
        grain=part_axis(center)
        for li in poly.loop_indices:
            point=to_unity(mesh.vertices[mesh.loops[li].vertex_index].co)
            layer.data[li].uv=uv(point,axis,grain,origin,2.,mode)

def state_object(mask,mat,name,origin=(0,0,0),mode='world_directional'):
    mesh,stats=optimized_state(fence(mask),'oak_planks',33,keep_mesh=True)
    mesh.materials[0]=mat;reference_uv(mesh,origin,mode)
    ob=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(ob)
    ob['review_connection_mask']=mask;ob['reference_cell_world_origin']=list(origin)
    ob['uv_reference_mode']=mode;ob['native_shader_integrated']=False;ob['mobile_verified']=False
    return ob,stats

def constant_rig(scene):
    camera,ground=rig(scene);ground.hide_render=True
    # Directional lights give every staged model identical illumination.
    for ob in list(scene.objects):
        if ob.type!='LIGHT':continue
        ob.data.type='SUN';ob.data.energy=1.25 if ob.name=='WarmKey' else .3;ob.data.angle=.08
    scene.cycles.samples=16
    return camera

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
    scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1.
    camera=constant_rig(scene);mat=material_for('oak_planks');use_preview_toon(mat)
    scene.render.resolution_x=1280;scene.render.resolution_y=1280
    camera.data.ortho_scale=7.1;camera.location=(3.7,4.3,3.5);aim(camera,(.5,-.5,.45))
    center=Vector((.5,-.5,.45));q=camera.rotation_euler.to_quaternion()
    right=q@Vector((1,0,0));up=q@Vector((0,1,0))
    states=[];rows=[]
    for mask in range(16):
        ob,stats=state_object(mask,mat,'STATE_'+format(mask,'04b'))
        col=mask%4;row=mask//4
        ob.location=right*((col-1.5)*1.67)+up*((1.5-row)*1.67)
        states.append(ob);rows.append({'mask':mask,'mask_bit_order':['south','west','north','east'],
           'triangles':stats['triangles'],'gpu_attribute_key_estimate':stats['gpu_split_vertices_estimate'],
           'visual_state_review':'rendered_pending_independent_review','native_neighbor_test':False})
    render(scene,ROOT/'previews'/'oak_fence_connection16_raw.png')
    for ob in states:ob.hide_render=True
    # Three parallel four-cell chains. End masks reflect actual chain neighbors.
    # Staging is only page layout; the explicit UV world origin is the logical cell.
    scene.render.resolution_x=1280;scene.render.resolution_y=960
    camera.data.ortho_scale=6.;camera.location=(4.6,7.,4.2);aim(camera,(2.,-.5,.5))
    q=camera.rotation_euler.to_quaternion();up=q@Vector((0,1,0))
    chains=[]
    for row,mode in enumerate(('local_reset','world_directional','native_projection_approx')):
        for x in range(4):
            mask=8 if x==0 else 2 if x==3 else 10
            ob,stats=state_object(mask,mat,mode+'_cell_'+str(x),(x,0,0),mode)
            ob.location=Vector(to_blender((x,0,0)))+up*((1-row)*1.45)
            chains.append(ob)
    render(scene,ROOT/'previews'/'oak_fence_phase_comparison_raw.png')
    # Save reproducible review scene with world-origin properties and packed texture.
    # Editing those properties alone is not a live UV adapter: rerun this script.
    scene['review_only']=True;scene['native_integrated']=False;scene['repeat_meters']=2.
    scene['uv_reference_rebuild']='Rerun render_fence_states_phase.py after changing logical cell origin parameters; custom properties are provenance only'
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source'/'oak_fence_connection_phase_reference.blend'),compress=True)
    report={'source_state':'historical 0956b077','state_count':16,'states':rows,
      'modes_in_comparison_top_to_bottom':['cell-local reset','explicit world-offset + part-direction review UV','projection-only native triplanar-rule approximation'],
      'renderer':'Blender 4.3.2 Cycles CPU / diffuse toon approximation','threads':2,'samples':16,
      'shared_materials':1,'wood_512_sha256':hashlib.sha256(texture_path('oak_planks').read_bytes()).hexdigest(),
      'phase_contract':run_contracts(),'native_hlsl_executed':False,'native_integrated':False,'mobile_pass':False,
      'staging_note':'Object placement in the page is separate from the explicitly supplied logical cell-world origin. This is a reference UV bake, not native world-triplanar execution.'}
    (ROOT/'reports'/'fence-state-phase-render.json').write_text(json.dumps(report,indent=2))
    print('RESULT '+json.dumps({'status':'16_states_and_3_phase_modes_rendered','native_integrated':False}),flush=True)

if __name__=='__main__':main()
