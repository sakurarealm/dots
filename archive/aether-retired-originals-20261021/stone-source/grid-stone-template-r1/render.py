import bpy,json,sys,hashlib
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent;mode=sys.argv[-1]
base=D.parent/'workshop-levels-L5-rooftop-cloud-r9c/rooftop-cloud.blend';src=base if mode=='before-close'else D/'stone-grid-trial.blend';bpy.ops.wm.open_mainfile(filepath=str(src));S=bpy.context.scene;cam=S.camera
if mode.endswith('close'):
 target=Vector((4.5,0,-.2));cam.location=Vector((5,-10,3.8));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=6
if mode=='after-full-corrected':
 target=Vector((8,6,8.5));direction=Vector((1,-1.4,1)).normalized();cam.location=target+direction*45;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=31
S.render.threads_mode='FIXED';S.render.threads=2;S.cycles.samples=24;S.cycles.use_denoising=False;S.render.resolution_x=1000;S.render.resolution_y=850;S.render.resolution_percentage=100;S.render.filepath=str(D/(mode+'.png'))
(D/(mode+'-view.json')).write_text(json.dumps({'source':src.name,'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'camera':list(cam.location),'rotationEuler':list(cam.rotation_euler),'orthoScale':cam.data.ortho_scale,'noGeometryHidden':True,'resolution':[1000,850]},indent=2));bpy.ops.render.render(write_still=True)
