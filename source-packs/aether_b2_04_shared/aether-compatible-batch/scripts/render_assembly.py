"""Two Blender-only views of the partial compatibility kit, not a finished building."""
import bpy,math,sys,json
from pathlib import Path
from mathutils import Vector,Matrix
sys.path.insert(0,str(Path(__file__).resolve().parent))
from render_samples import mat,light,camera,render
ROOT=Path(__file__).resolve().parents[1]
FIRST=next((p for p in [ROOT.parent/'aether-first-batch',ROOT.parent/'aether-assets'] if (p/'source/town_building_a_frame_bay_v01.blend').exists()),None)
assert FIRST is not None,'Place the reviewed first batch beside this compatibility batch.'

def append_visual(path,name):
    with bpy.data.libraries.load(str(path),link=False) as (_,data):data.objects=['LOD0_Static']
    ob=data.objects[0];ob.parent=None;ob.matrix_world=Matrix.Identity(4);ob.name=name
    bpy.context.scene.collection.objects.link(ob);ob.hide_render=False;ob.hide_set(False)
    # All maps match the reviewed shared first-batch palette; reduce redundant
    # preview materials without altering any source or exported model.
    for slot in ob.material_slots:
        base=slot.material.name.split('.')[0]
        canonical=bpy.data.materials.get(base)
        if canonical:slot.material=canonical
    return ob

def copy_at(ob,name,loc,rz=0):
    c=ob.copy();c.data=ob.data;c.name=name;bpy.context.scene.collection.objects.link(c);c.location=loc;c.rotation_euler[2]=rz;return c

bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
frame=append_visual(FIRST/'source/town_building_a_frame_bay_v01.blend','Frame_0')
floor=append_visual(ROOT/'source/town_building_floor_bay_v01.blend','Floor_0')
side=append_visual(ROOT/'source/town_building_side_infill_v01.blend','Side_0')
gable=append_visual(ROOT/'source/town_building_gable_screen_v01.blend','Gable_Front')
side.location=(1.90,0,.10);side.rotation_euler[2]=math.pi/2;gable.location=(0,-.285,2.195)
objects=[frame,floor,side,gable]
for y in [1,2]:
    objects.extend([copy_at(frame,'Frame_'+str(y),(0,y,0)),copy_at(floor,'Floor_'+str(y),(0,y,0)),copy_at(side,'Side_'+str(y),(1.90,y,.10),math.pi/2)])
bpy.context.view_layer.update()
vertices=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
lo=Vector([min(v[i] for v in vertices) for i in range(3)]);hi=Vector([max(v[i] for v in vertices) for i in range(3)]);center=(lo+hi)/2;scale=max(hi-lo)
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.cycles.max_bounces=4
scene.render.threads_mode='FIXED';scene.render.threads=2;scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.world=bpy.data.worlds.new('AssemblyReviewWorld');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.76,.80,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
bpy.ops.mesh.primitive_plane_add(size=scale*200,location=(0,0,-.007));bpy.context.object.data.materials.append(mat('REVIEW_Ground',(.56,.57,.54)))
light('REVIEW_Key',center+Vector((-2.2,-3,4.5))*scale,center,180*scale*scale,2.4*scale,(1,.94,.84))
light('REVIEW_Fill',center+Vector((3,-1,2.5))*scale,center,80*scale*scale,2.8*scale,(.78,.86,1))
light('REVIEW_Rim',center+Vector((0,3,3.8))*scale,center,100*scale*scale,2*scale,(.92,1,.95))
out=ROOT/'previews/compatibility_assembly';out.mkdir(parents=True,exist_ok=True)
cam=camera('REVIEW_AssemblyCamera',center+Vector((-2.2,-3.2,2.1)).normalized()*scale*2.25,center)
render(scene,out/'assembly_perspective.png');bpy.data.objects.remove(cam,do_unlink=True)
cam=camera('REVIEW_FrontCamera',center+Vector((0,-3,0))*scale,center,scale*1.30)
render(scene,out/'assembly_front.png')
(ROOT/'reports/assembly-render-report.json').write_text(json.dumps({'scope':'partial Blender compatibility assembly','is_game_screenshot':False,'is_complete_building':False,'frame_bays':3,'floor_bays':3,'side_infill_panels':3,'gable_screens':1,'component_sources_unchanged':True,'unity_test':'not_run','views':['assembly_perspective.png','assembly_front.png']},indent=2))
print('ASSEMBLY_RENDERS_PASS')
