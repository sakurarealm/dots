"""Six real material treatments on one unchanged barrel, fixed camera, UVs and lights.
/usr/bin/blender -b -t 2 --python scripts/render_six_styles.py
This creates one reusable geometry + twelve material library variants, not six asset models.
"""
import bpy,json,pathlib,math,hashlib,datetime,os,time
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1];ART=pathlib.Path(os.environ.get('AETHER_STYLE_ART_ROOT',str(ROOT/'styles')));cfg=json.loads((ART/'style-recipes.json').read_text());OUT=ROOT/'styles';baseline=ROOT/'source/aether_wooden_barrel_v01_sample.blend'
def guard():
 while True:
  avail=int(next(x for x in open('/proc/meminfo') if x.startswith('MemAvailable:')).split()[1])*1024;fs=os.statvfs(ROOT);free=fs.f_bavail*fs.f_frsize
  if avail>=2*1024**3 and free>=3*1024**3:return
  stage('resource_wait','等待安全的内存/磁盘余量');time.sleep(30)
def stage(st,zh,record=None):
 p=ROOT/'status.json';s=json.loads(p.read_text());now=datetime.datetime.now(datetime.timezone.utc).isoformat();s.update(stage=st,stage_zh=zh,updated_at_utc=now,heartbeat_at_utc=now,state='review' if st=='six_styles_ready' else 'running')
 if record:s.setdefault('style_outputs',[]).append(record)
 q=p.with_suffix('.tmp');q.write_text(json.dumps(s,indent=2));q.replace(p)
 with open(ROOT/'events.jsonl','a') as f:f.write(json.dumps({'at_utc':now,'event':st,'detail':zh,'output':record},ensure_ascii=False)+'\n')
def srgb(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4

guard();bpy.ops.wm.open_mainfile(filepath=str(baseline));s=bpy.context.scene;s.render.threads_mode='FIXED';s.render.threads=2;s.cycles.use_denoising=False;o=bpy.data.objects['aether_wooden_barrel_v01'];basewood=bpy.data.materials['M_Shared_WarmWood'];baseiron=bpy.data.materials['M_Shared_MatteIron']
def geometry_sig():
 d={'vertices':[[round(v,8) for v in p.co] for p in o.data.vertices],'polygons':[list(p.vertices) for p in o.data.polygons],'material_indices':[p.material_index for p in o.data.polygons],'uv0':[[round(v,8) for v in x.uv] for x in o.data.uv_layers.active.data]};return hashlib.sha256(json.dumps(d,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def scene_sig():
 bpy.context.view_layer.update();d={'camera':[list(r) for r in s.camera.matrix_world],'ortho_scale':s.camera.data.ortho_scale,'lights':[{'name':x.name,'matrix':[list(r) for r in x.matrix_world],'energy':x.data.energy,'size':x.data.size} for x in sorted(s.objects,key=lambda x:x.name) if x.type=='LIGHT'],'world_color':list(s.world.node_tree.nodes['Background'].inputs[0].default_value),'world_strength':s.world.node_tree.nodes['Background'].inputs[1].default_value,'exposure':s.view_settings.exposure,'view_transform':s.view_settings.view_transform,'look':s.view_settings.look,'render_samples':s.cycles.samples,'render_resolution':[s.render.resolution_x,s.render.resolution_y],'object_matrix':[list(r) for r in o.matrix_world]};return hashlib.sha256(json.dumps(d,sort_keys=True,separators=(',',':')).encode()).hexdigest()
g0=geometry_sig();c0=scene_sig();carrier=json.loads((ROOT/'reports/barrel_style_carrier.json').read_text());assert g0==carrier['geometry_uv_material_assignment_sha256']
light_dir=(bpy.data.objects['Key_Area'].location-Vector((0,0,.51))).normalized()
variants={}
for st in cfg['styles']:
 id=st['id'];wood=basewood.copy();wood.name='M_Style_'+id+'_Wood';iron=baseiron.copy();iron.name='M_Style_'+id+'_Iron'
 texpath=ART/'textures'/st['texture'];im=bpy.data.images.load(str(texpath));im.name='T_Style_'+id+'_Wood_Albedo';im.colorspace_settings.name='sRGB';im.pack();wood.node_tree.nodes['Shared_Source_Albedo'].image=im;tex=wood.node_tree.nodes['Shared_Source_Albedo'];p=wood.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=st['wood']['roughness'];p.inputs['Metallic'].default_value=st['wood']['metallic'];sh=st['shading']
 if sh['bands']:
  n=wood.node_tree.nodes;l=wood.node_tree.links;geo=n.new('ShaderNodeNewGeometry');geo.name='Fixed_World_Normal';dot=n.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT';dot.name='Fixed_Key_NdotL';dot.inputs[1].default_value=light_dir;l.new(geo.outputs['Normal'],dot.inputs[0]);rem=n.new('ShaderNodeMath');rem.operation='MULTIPLY_ADD';rem.name='NdotL_To_0_1';rem.inputs[1].default_value=.5;rem.inputs[2].default_value=.5;l.new(dot.outputs['Value'],rem.inputs[0]);r=n.new('ShaderNodeValToRGB');r.name='Style_Art_Value_Grouping';r.color_ramp.interpolation='CONSTANT' if sh['type']=='cel_piecewise' else 'LINEAR';points=[];strength=sh['blend_strength'];factors=[1-strength+strength*x for x in sh['multipliers']]
  points.append((0,factors[0]))
  for i,t in enumerate(sh['thresholds']):
   if sh['type']=='cel_piecewise':points.append((t,factors[i+1]))
   else:
    w=sh.get('transition_width',.15)/2;points.extend([(max(0,t-w),factors[i]),(min(1,t+w),factors[i+1])])
  points.append((1,factors[-1]));els=r.color_ramp.elements
  els[0].position=points[0][0];els[0].color=(points[0][1],)*3+(1,);els[1].position=points[-1][0];els[1].color=(points[-1][1],)*3+(1,)
  for pos,factor in points[1:-1]:e=els.new(pos);e.color=(factor,factor,factor,1)
  l.new(rem.outputs[0],r.inputs['Fac']);mul=n.new('ShaderNodeMixRGB');mul.name='Albedo_x_Art_Value_Group';mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;l.new(tex.outputs['Color'],mul.inputs[1]);l.new(r.outputs['Color'],mul.inputs[2]);l.new(mul.outputs['Color'],p.inputs['Base Color'])
 ip=iron.node_tree.nodes['Principled BSDF'];ip.inputs['Base Color'].default_value=(*[srgb(x) for x in st['iron']['base_color_srgb'][:3]],1);ip.inputs['Roughness'].default_value=st['iron']['roughness'];ip.inputs['Metallic'].default_value=st['iron']['metallic']
 wood['style_scope']='Original comparison art direction; not exact source-game/movie shader or accepted current project material';wood['stroke_structure']=st['stroke_structure'];iron['style_scope']=wood['style_scope'];variants[id]=(wood,iron)
# Exactly one mesh used for every style; names in the library are the switch interface
style_records=[]
for st in cfg['styles']:
 guard();id=st['id'];o.data.materials[0]=variants[id][0];o.data.materials[1]=variants[id][1];assert geometry_sig()==g0;assert scene_sig()==c0
 stage('render_style_'+id,'固定场景渲染：'+st['label'])
 path=OUT/'previews'/('barrel_'+id+'_768.png');s.render.filepath=str(path);bpy.ops.render.render(write_still=True)
 rec={'id':id,'label':st['label'],'render':str(path),'purpose':'同一木桶固定相机/光照/几何的真实材质比较图','texture':str(ART/'textures'/st['texture']),'texture_sha256':hashlib.sha256((ART/'textures'/st['texture']).read_bytes()).hexdigest(),'render_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'materials':[m.name for m in variants[id]],'geometry_uv_assignment_sha256':geometry_sig(),'fixed_scene_sha256':scene_sig(),'stroke_structure':st['stroke_structure'],'shading_recipe':st['shading'],'wood_recipe':st['wood'],'iron_recipe':st['iron'],'state':'rendered_pending_independent_review'};style_records.append(rec);stage('style_rendered_'+id,'比较图已生成：'+st['label'],rec)
 (OUT/'reports/six_styles_manifest.json').write_text(json.dumps({'scope':cfg['purpose'],'completed_styles':len(style_records),'expected_styles':6,'source_carrier':str(baseline),'source_carrier_sha256':hashlib.sha256(baseline.read_bytes()).hexdigest(),'fixed_geometry_uv_assignment_sha256':g0,'fixed_scene_sha256':c0,'records':style_records,'material_library':'One shared barrel mesh, twelve material variants; no six-geometry claim','shader_note':'Proposed NdotL art grouping modulates diffuse albedo while original physical lights/shadows stay fixed. It is not an exact source-game shader.','limitations':['1254px art comparison masters, not mobile delivery textures','Texture wrap continuity not accepted; full-height once, no vertical repeat','BK exact source unidentified, provisional historical workbench direction','Unity/native material routing/runtime/device budgets untested']},indent=2,ensure_ascii=False))
# Save one editable shared-geometry comparison scene; selected default BK
for m in variants.values():
 for mat in m:mat.use_fake_user=True
o.data.materials[0]=variants['bk'][0];o.data.materials[1]=variants['bk'][1];s.render.filepath=str(OUT/'previews/barrel_bk_768.png');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source/barrel_six_styles_library.blend'))
stage('six_styles_ready','六风格真实材质比较图就绪，等待独立审阅',{'path':str(OUT/'source/barrel_six_styles_library.blend'),'purpose':'同一木桶及12个可切换材质的编辑源文件'})
print('DONE SIX STYLES',len(style_records))
