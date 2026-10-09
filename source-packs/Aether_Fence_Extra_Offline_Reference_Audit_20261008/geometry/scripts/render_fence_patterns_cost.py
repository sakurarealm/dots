"""Read-only-style independent assembly and cost references; no native implementation."""
import bpy,bmesh,json,sys,hashlib
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import ROOT,fence,DIR,cell_shell
from validate_state_meshes import optimized_state
from build_shapes import to_blender,to_unity,material_for,add_review_uv,select_only
from render_shapes import aim,use_preview_toon,render
from render_fence_states_phase import constant_rig,reference_uv,state_object

PATTERNS={'line':[(0,0),(1,0),(2,0),(3,0)],'corner':[(0,0),(1,0),(1,1)],
          'T':[(-1,0),(0,0),(1,0),(0,1)],'four_way':[(-1,0),(0,0),(1,0),(0,-1),(0,1)]}

def mask_for(x,z,cells):
    return sum(1<<d for d,(dx,dy,dz) in DIR.items() if (x+dx,z+dz) in cells)

def boundary_neighbor(points,cell,cells):
    for axis in (0,2):
        for side in (0.,1.):
            if all(abs(p[axis]-side)<1e-7 for p in points):
                dx=(1 if side else -1) if axis==0 else 0
                dz=(1 if side else -1) if axis==2 else 0
                return (cell[0]+dx,cell[1]+dz) in cells
    return False

def assembled_pattern(name,cells,mat):
    cells=set(cells);vertices=[];faces=[];uvs=[];weld={};before=removed=0;area=volume=0.
    joins=sum((x+1,z) in cells for x,z in cells)+sum((x,z+1) in cells for x,z in cells)
    for x,z in sorted(cells):
        mask=mask_for(x,z,cells);mesh,stats=optimized_state(fence(mask),'oak_planks',33,keep_mesh=True)
        reference_uv(mesh,(x,0,z),'world_directional');before+=stats['triangles']
        area+=stats['surface_area_m2'];volume+=stats['volume_m3']
        for poly in mesh.polygons:
            points=[to_unity(mesh.vertices[i].co) for i in poly.vertices]
            if boundary_neighbor(points,(x,z),cells):
                removed+=len(poly.vertices)-2;continue
            indices=[];face_uv=[]
            for li in poly.loop_indices:
                p=to_unity(mesh.vertices[mesh.loops[li].vertex_index].co);p=(p[0]+x,p[1],p[2]+z)
                if p not in weld:weld[p]=len(vertices);vertices.append(to_blender(p))
                indices.append(weld[p]);face_uv.append(tuple(mesh.uv_layers[0].data[li].uv))
            faces.append(indices);uvs.append(face_uv)
        bpy.data.meshes.remove(mesh)
    me=bpy.data.meshes.new('Assembled_'+name);me.from_pydata(vertices,[],faces);me.update();me.materials.append(mat)
    layer=me.uv_layers.new(name='WorldOffsetDirectionReview')
    for poly,face_uv in zip(me.polygons,uvs):
        poly.use_smooth=False
        for li,value in zip(poly.loop_indices,face_uv):layer.data[li].uv=value
    me.calc_loop_triangles();bm=bmesh.new();bm.from_mesh(me);bm.normal_update()
    actual_area=sum(f.calc_area() for f in bm.faces);actual_volume=bm.calc_volume(signed=True)
    nonmanifold=sum(not e.is_manifold for e in bm.edges);bm.free()
    assert abs(actual_volume-volume)<1e-6
    assert abs(actual_area-(area-joins*.125))<1e-6,(name,actual_area,area,joins)
    assert nonmanifold==0,(name,nonmanifold)
    ob=bpy.data.objects.new('PATTERN_'+name,me);bpy.context.scene.collection.objects.link(ob)
    ob['reference_only']=True;ob['native_integrated']=False;ob['world_offset_direction_uv']=True
    return ob,{'pattern':name,'cells':sorted(cells),'join_count':joins,'unculled_closed_cell_triangles':before,
      'removed_physically_hidden_contact_cap_triangles':removed,'assembled_triangles':len(me.loop_triangles),
      'surface_area_m2':actual_area,'volume_m3':actual_volume,'non_manifold_edges':nonmanifold,
      'native_integrated':False,'collider_tested':False}

def box_variant(mask,mat,trim=False):
    boxes=fence(mask);vertices=[];faces=[]
    for index,(lo,hi) in enumerate(boxes):
        lo=list(lo);hi=list(hi);omitted_axis=omitted_value=None
        if trim and index>0:
            # Rails meet the post exactly; omit only the rail's fully hidden mouth.
            if hi[0]==1. and lo[0]==.5:lo[0]=.625;omitted_axis=0;omitted_value=.625
            elif lo[0]==0. and hi[0]==.5:hi[0]=.375;omitted_axis=0;omitted_value=.375
            elif hi[2]==1. and lo[2]==.5:lo[2]=.625;omitted_axis=2;omitted_value=.625
            elif lo[2]==0. and hi[2]==.5:hi[2]=.375;omitted_axis=2;omitted_value=.375
        shell=cell_shell([(tuple(lo),tuple(hi))]);offset=len(vertices)
        vertices.extend(to_blender(p) for p in shell['vertices_unity'])
        for f in shell['faces']:
            points=[shell['vertices_unity'][i] for i in f]
            if omitted_axis is not None and all(abs(p[omitted_axis]-omitted_value)<1e-8 for p in points):continue
            faces.append(tuple(i+offset for i in f))
    me=bpy.data.meshes.new('TrimmedRailsReference' if trim else 'OverlappingBoxReference')
    me.from_pydata(vertices,[],faces);me.update();add_review_uv(me,33,'oak_planks')
    me.uv_layers.remove(me.uv_layers['Historical_UV0_texId_DO_NOT_BIND']);me.materials.append(mat)
    for poly in me.polygons:poly.use_smooth=False
    me.calc_loop_triangles()
    return me

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
    camera=constant_rig(scene);mat=material_for('oak_planks');use_preview_toon(mat)
    scene.cycles.samples=16;scene.render.resolution_x=1280;scene.render.resolution_y=1080
    camera.location=(5.5,6.5,5.0);aim(camera,(.5,-.5,.5));camera.data.ortho_scale=10.
    q=camera.rotation_euler.to_quaternion();right=q@Vector((1,0,0));up=q@Vector((0,1,0))
    patterns=[];rows=[]
    for i,(name,cells) in enumerate(PATTERNS.items()):
        ob,stats=assembled_pattern(name,cells,mat)
        center=Vector((sum(x+.5 for x,z in cells)/len(cells),-sum(z+.5 for x,z in cells)/len(cells),.5))
        staging=right*((i%2-.5)*4.5)+up*((.5-i//2)*3.7)
        ob.location=Vector((.5,-.5,.5))-center+staging;patterns.append(ob);rows.append(stats)
    render(scene,ROOT/'previews'/'oak_fence_multicell_world_phase_raw.png')
    for ob in patterns:ob.hide_render=True
    scene.render.resolution_x=1280;scene.render.resolution_y=540
    camera.location=(3.7,4.3,3.5);aim(camera,(.5,-.5,.45));camera.data.ortho_scale=5.6
    q=camera.rotation_euler.to_quaternion();right=q@Vector((1,0,0))
    union,stats=state_object(10,mat,'COST_union')
    old=box_variant(10,mat,False);native=bpy.data.objects.new('COST_boxes60',old);scene.collection.objects.link(native)
    trim=box_variant(10,mat,True);partial=bpy.data.objects.new('COST_partial52_render_only',trim);scene.collection.objects.link(partial)
    for i,ob in enumerate((union,native,partial)):
        ob.location=right*((i-1)*1.75);ob['native_integrated']=False;ob['mobile_verified']=False
    render(scene,ROOT/'previews'/'oak_fence_representation_cost_raw.png')
    trim.calc_loop_triangles();assert len(trim.loop_triangles)==52
    select_only(partial)
    output=mat.node_tree.nodes.get('Material Output')
    toon=next(n for n in mat.node_tree.nodes if n.type=='BSDF_TOON')
    for link in list(output.inputs['Surface'].links):mat.node_tree.links.remove(link)
    mat.node_tree.links.new(mat.node_tree.nodes.get('Principled BSDF').outputs['BSDF'],output.inputs['Surface'])
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'exports'/'oak_fence_partial52_render_reference.glb'),
      export_format='GLB',use_selection=True,export_texcoords=True,export_normals=True,export_tangents=False,export_materials='EXPORT')
    for link in list(output.inputs['Surface'].links):mat.node_tree.links.remove(link)
    mat.node_tree.links.new(toon.outputs['BSDF'],output.inputs['Surface'])
    scene['review_only']=True;scene['partial52_not_collider_mesh']=True
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source'/'oak_fence_patterns_cost_reference.blend'),compress=True)
    result={'scope':'Independent reference assembly and rendering study; not engine integration or phone measurement',
      'patterns':rows,'mask10_representations':{'closed_union_triangles':84,'overlapping_boxes_triangles':60,
       'trimmed_rails_partial_hidden_cap_triangles':52,'partial52_closed_union':False,
       'partial52_partial_post_join_surface_remains_internal':True,'partial52_validated_collider':False},
      'fourway_representation_triangles':{'closed_union':160,'overlapping_boxes':108,'partial_hidden_rail_caps':92},
      'selected_mobile_representation':None,'mobile_pass':False,
      'partial52_tradeoff':'Trims overlapping rail portions and removes their hidden mouth caps, but keeps the post face behind rail joints. It is a render-only comparison with open rail component boundaries, not a closed collision shell or full internal-face removal.'}
    (ROOT/'reports'/'fence-patterns-cost-study.json').write_text(json.dumps(result,indent=2))
    print('RESULT '+json.dumps({'status':'patterns_and_cost_study_complete','partial52_not_physics_pass':True}),flush=True)

if __name__=='__main__':main()
