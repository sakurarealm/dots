"""Same-camera CPU previews. These are Blender approximations, never Unity/device evidence."""
import bpy, json, sys, math, hashlib
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import ROOT,REPRESENTATIVES
from build_shapes import texture_path

def aim(ob,point):ob.rotation_euler=(Vector(point)-ob.location).to_track_quat('-Z','Y').to_euler()

def rig(scene):
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24
    scene.cycles.use_denoising=False;scene.cycles.max_bounces=3
    scene.cycles.diffuse_bounces=2;scene.cycles.glossy_bounces=1
    scene.render.threads_mode='FIXED';scene.render.threads=2
    scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.film_transparent=False
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
    scene.view_settings.exposure=0.;scene.view_settings.gamma=1.
    world=bpy.data.worlds.new('SoftGreenEnvironment');world.use_nodes=True;scene.world=world
    bg=world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.54,.64,.58,1)
    bg.inputs['Strength'].default_value=.55
    for name,location,energy,size,color in [('WarmKey',(-2.2,3.5,5.),320.,3.,(1.,.91,.75)),
                                          ('GreenFill',(3.5,-2.5,2.5),90.,4.,(.72,.91,.79))]:
        data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
        ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=location
        aim(ob,(.5,-.5,.45))
    groundmat=bpy.data.materials.new('Preview_Backdrop');groundmat.use_nodes=True
    bsdf=groundmat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(.72,.79,.73,1);bsdf.inputs['Roughness'].default_value=1.
    me=bpy.data.meshes.new('Backdrop');me.from_pydata([(-200,-200,-.014),(200,-200,-.014),
             (200,200,-.014),(-200,200,-.014)],[],[(0,1,2,3)]);me.materials.append(groundmat)
    ground=bpy.data.objects.new('PreviewGround',me);scene.collection.objects.link(ground)
    camdata=bpy.data.cameras.new('ReviewCamera');camdata.type='ORTHO';camdata.ortho_scale=1.92
    camera=bpy.data.objects.new('ReviewCamera',camdata);scene.collection.objects.link(camera)
    camera.location=(2.6,3.1,2.65);aim(camera,(.5,-.5,.42));scene.camera=camera
    return camera,ground

def use_preview_toon(mat):
    nt=mat.node_tree;img=next(n for n in nt.nodes if n.type=='TEX_IMAGE')
    output=nt.nodes.get('Material Output')
    for link in list(output.inputs['Surface'].links):nt.links.remove(link)
    toon=nt.nodes.new('ShaderNodeBsdfToon');toon.component='DIFFUSE'
    toon.inputs['Size'].default_value=.65;toon.inputs['Smooth'].default_value=.07
    nt.links.new(img.outputs['Color'],toon.inputs['Color']);nt.links.new(toon.outputs['BSDF'],output.inputs['Surface'])
    return img

def render(scene,path):
    scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    print('RENDER_READY',path,flush=True)

def main():
    out=ROOT/'previews';out.mkdir(exist_ok=True)
    reports=[]
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    specs=[s for s in REPRESENTATIVES if not args or s['asset'] in args]
    for spec in specs:
        asset=spec['asset'];bpy.ops.wm.open_mainfile(filepath=str(ROOT/'source'/(asset+'_master_and_candidate.blend')))
        scene=bpy.context.scene;camera,ground=rig(scene)
        master=bpy.data.objects['MASTER_'+asset];opt=bpy.data.objects['OPT_'+asset]
        mat=opt.data.materials[0];texnode=use_preview_toon(mat)
        provenance={}
        for stage,ob,res in [('master_geometry',master,'candidate_512'),('optimized_geometry',opt,'candidate_512'),
                             ('optimized_mobile256',opt,'mobile_256')]:
            master.hide_render=ob!=master;opt.hide_render=ob!=opt
            p=texture_path(spec['family'],res)
            if not p.is_file():raise RuntimeError('Shared texture missing '+str(p))
            texnode.image=bpy.data.images.load(str(p),check_existing=True)
            provenance[stage]={'texture_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'texture_resolution':res}
            render(scene,out/(asset+'_'+stage+'.png'))
        # Functional low-angle/back inspection exposes rails, low risers and silhouette.
        master.hide_render=True;opt.hide_render=False
        texnode.image=bpy.data.images.load(str(texture_path(spec['family'])),check_existing=True)
        camera.location=(-2.3,-3.4,1.65);camera.data.ortho_scale=1.85;aim(camera,(.5,-.5,.48))
        render(scene,out/(asset+'_back_low.png'))
        # Clay side inspection: no texture hiding bad winding, smoothing or loss of form.
        clay=bpy.data.materials.new('Preview_Clay');clay.use_nodes=True
        p=clay.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.61,.67,.59,1)
        p.inputs['Roughness'].default_value=1.;p.inputs['Specular IOR Level'].default_value=0.
        opt.data.materials[0]=clay;camera.location=(2.6,3.1,2.65);camera.data.ortho_scale=1.92;aim(camera,(.5,-.5,.42))
        render(scene,out/(asset+'_clay.png'))
        reports.append({'asset':asset,'renderer':'Blender 4.3.2 Cycles CPU; preview Diffuse Toon shader only',
          'samples':24,'threads':2,'resolution':[640,640],'denoising':False,
          'same_camera_master_reduced':True,'same_shared_texture_master_reduced':True,
          'native_shader_test':False,'unity_screenshot':False,'device_test':False,'material_provenance':provenance,
          'images':[str(p.relative_to(ROOT)) for p in sorted(out.glob(asset+'*.png'))]})
    target=ROOT/'reports'/'render-audit.json'
    previous=json.loads(target.read_text()) if target.exists() else []
    combined={x['asset']:x for x in previous}
    combined.update({x['asset']:x for x in reports})
    target.write_text(json.dumps(list(combined.values()),indent=2))
    print('RESULT '+json.dumps({'status':'renders_complete','count':len(reports)*5,'mobile_pass':False}),flush=True)

if __name__=='__main__':main()
