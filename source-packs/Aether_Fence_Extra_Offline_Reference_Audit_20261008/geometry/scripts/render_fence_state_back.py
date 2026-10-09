import bpy,sys,json
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import ROOT
from render_shapes import aim,render

def main():
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'source'/'oak_fence_connection_phase_reference.blend'))
    scene=bpy.context.scene;camera=scene.camera
    scene.render.resolution_x=1280;scene.render.resolution_y=1280;camera.data.ortho_scale=7.1
    camera.location=(-2.7,-4.3,3.5);aim(camera,(.5,-.5,.45))
    q=camera.rotation_euler.to_quaternion();right=q@Vector((1,0,0));up=q@Vector((0,1,0))
    for ob in scene.objects:
        if ob.type!='MESH':continue
        if ob.name.startswith('STATE_'):
            ob.hide_render=False;mask=int(ob['review_connection_mask']);col=mask%4;row=mask//4
            ob.location=right*((col-1.5)*1.67)+up*((1.5-row)*1.67)
        else:ob.hide_render=True
    render(scene,ROOT/'previews'/'oak_fence_connection16_back_raw.png')
    (ROOT/'reports'/'fence-state-back-render.json').write_text(json.dumps({'state_count':16,
      'camera_complements_front':True,'source_state':'historical 0956b077','native_integrated':False,
      'mobile_pass':False,'threads':2,'samples':scene.cycles.samples},indent=2))
    print('RESULT 16_STATE_BACK_VIEWS_COMPLETE',flush=True)

if __name__=='__main__':main()
