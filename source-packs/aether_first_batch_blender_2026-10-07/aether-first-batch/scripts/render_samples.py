"""Low-memory CPU review renders, explicitly not screenshots from Unity."""
import bpy, math, json, sys, time
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
ONLY_VIEWS=set(next((arg.split('=',1)[1] for arg in sys.argv if arg.startswith('--only-views=')),'').split(','))-{''}

def mat(name,color,rough=1):
    m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;return m

def light(name,position,target,energy,size,color):
    d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);o.location=position;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o

def camera(name,position,target,ortho=None):
    data=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(o);o.location=position;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    if ortho:data.type='ORTHO';data.ortho_scale=ortho
    else:data.type='PERSP';data.lens=54
    data.clip_start=.01;data.clip_end=1000;bpy.context.scene.camera=o;return o

def render(scene,out):
    if ONLY_VIEWS and out.stem not in ONLY_VIEWS:return
    scene.render.filepath=str(out);bpy.ops.render.render(write_still=True);print('RENDER_READY',out,flush=True)

def main():
    sources=sorted((ROOT/'source').glob('*.blend'))
    if '--' in sys.argv:
        names=[a for a in sys.argv[sys.argv.index('--')+1:] if not a.startswith('--')]
        if names:sources=[p for p in sources if p.stem in names]
    reports=[]
    for src in sources:
        bpy.ops.wm.open_mainfile(filepath=str(src));scene=bpy.context.scene;asset=src.stem;out=ROOT/'previews'/asset;out.mkdir(exist_ok=True,parents=True)
        root=bpy.data.objects[asset];visual=[o for o in root.children_recursive if o.type=='MESH' and o.name.startswith('LOD0')]
        for o in root.children_recursive:
            o.hide_render=o.type=='MESH' and not o.name.startswith('LOD0')
        bpy.context.view_layer.update();pts=[o.matrix_world@v.co for o in visual for v in o.data.vertices];lo=Vector([min(v[i] for v in pts) for i in range(3)]);hi=Vector([max(v[i] for v in pts) for i in range(3)]);dims=hi-lo;center=(lo+hi)/2;scale=max(dims)
        scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=2;scene.cycles.glossy_bounces=2
        scene.render.threads_mode='FIXED';scene.render.threads=2;scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=False
        scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=0.;scene.view_settings.gamma=1.
        scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.76,.80,1.);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
        bpy.ops.mesh.primitive_plane_add(size=scale*200,location=(0,0,-.007));ground=bpy.context.active_object;ground.name='REVIEW_ONLY_Ground';ground.data.materials.append(mat('REVIEW_ONLY_GroundMat',(.56,.57,.54)))
        # Energy and light distance scale with subject size, not one overpowering fixed lamp.
        light('REVIEW_ONLY_Key',center+Vector((-2.2,-3.0,4.5))*scale,center,180*scale*scale,2.4*scale,(1.,.94,.84))
        light('REVIEW_ONLY_Fill',center+Vector((3.,-1.0,2.5))*scale,center,80*scale*scale,2.8*scale,(.78,.86,1.))
        light('REVIEW_ONLY_Rim',center+Vector((0.,3.,3.8))*scale,center,100*scale*scale,2.*scale,(.92,1.,.95))
        views=[('front',Vector((0,-3,0)),True),('back',Vector((0,3,0)),True),('left',Vector((-3,0,0)),True),('right',Vector((3,0,0)),True),('top',Vector((0,-.001,3)),True),('perspective',Vector((2.2,-3.2,2.1)),False)]
        for name,dir,isortho in views:
            target=center.copy()
            location=center+(dir*scale if isortho else dir.normalized()*scale*2.25)
            cam=camera('REVIEW_ONLY_Camera',location,target,scale*1.30 if isortho else None)
            render(scene,out/(name+'.png'));bpy.data.objects.remove(cam,do_unlink=True)
        # Texture close-up is a true model render and uses the same light rig.
        if 'workbench' in asset:focus=Vector((.32,-.07,.80));distance=.75
        elif 'crate' in asset:focus=Vector((.14,-.24,.34));distance=.55
        else:focus=Vector((-1.60,-.46,2.08));distance=1.0
        cam=camera('REVIEW_ONLY_Closeup',focus+Vector((.9,-1.4,1.1))*distance,focus,distance*1.25)
        render(scene,out/'detail.png');bpy.data.objects.remove(cam,do_unlink=True)
        # Untextured faceting check. Restore materials afterward.
        clay=mat('REVIEW_ONLY_Clay',(.38,.40,.36));saved={o.name:list(o.data.materials) for o in visual}
        for o in visual:
            for i in range(len(o.data.materials)):o.data.materials[i]=clay
        cam=camera('REVIEW_ONLY_ClayCamera',center+Vector((2.2,-3.2,2.1))*scale,center,scale*1.45)
        render(scene,out/'clay.png')
        for o in visual:
            for i,ma in enumerate(saved[o.name]):o.data.materials[i]=ma
        # LOD silhouette/proportion comparisons at the exact same camera and framing.
        render(scene,out/'lod0.png')
        for lod in [1,2]:
            for o in root.children_recursive:
                if o.type=='MESH' and o.name=='LOD0_Static':o.hide_render=True
                if o.type=='MESH' and o.name=='LOD'+str(lod)+'_Static':o.hide_render=False
            render(scene,out/('lod'+str(lod)+'.png'))
            bpy.data.objects['LOD'+str(lod)+'_Static'].hide_render=True
        bpy.data.objects['LOD0_Static'].hide_render=False;bpy.data.objects.remove(cam,do_unlink=True)
        # UI icon is separate transparent PNG, with no baked text or game-state promise.
        scene.render.resolution_x=256;scene.render.resolution_y=256;scene.render.film_transparent=True;ground.hide_render=True
        cam=camera('REVIEW_ONLY_IconCamera',center+Vector((2.2,-3.2,2.1))*scale,center,scale*1.38)
        render(scene,out/'icon.png')
        # Source remains the editable geometry scene; the studio is a distinct review file.
        ground.hide_render=False;scene.render.film_transparent=False;scene.render.resolution_x=768;scene.render.resolution_y=768
        bpy.ops.wm.save_as_mainfile(filepath=str(out/'review_studio.blend'))
        reports.append({'asset_id':asset,'renderer':'Blender 4.3.2 Cycles CPU','threads':2,'samples':24,'denoising':False,'resolution':[768,768],'view_transform':'AgX','views':[x[0]+'.png' for x in views]+['detail.png','clay.png','lod0.png','lod1.png','lod2.png','icon.png'],'is_game_screenshot':False,'visual_review_status':'pending_independent_review'})
    target=ROOT/'reports'/'render-report.json'
    prior=json.loads(target.read_text()) if target.exists() else []
    combined={r['asset_id']:r for r in prior}
    for r in reports:
        if not ONLY_VIEWS:combined[r['asset_id']]=r
    target.write_text(json.dumps(list(combined.values()),indent=2));print('RENDER_SAMPLES_PASS')

if __name__=='__main__':main()
