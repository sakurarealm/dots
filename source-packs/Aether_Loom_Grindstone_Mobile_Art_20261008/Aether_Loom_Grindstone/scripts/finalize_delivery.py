#!/usr/bin/env python3
"""Create contact sheets, self-contained ZIP and truthful ready-for-review status."""
from pathlib import Path
import json,hashlib,datetime,zipfile
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[1]
OUTPUTS=[];SUMMARY=[]
for a in ['grindstone','loom']:
 o=R/a/'final';qa=json.load(open(o/'runtime_mesh_qa.json'));component=json.load(open(o/'mesh_qa.json'))
 labels=[('hero','Operator / crank'),('rear','Rear supports'),('front','Tool contact side'),('side','Axle / crank side')] if a=='grindstone' else [('hero','Operator / shuttle'),('rear','Rear structure'),('front','Warp / cloth output'),('side','Treadles / beam')]
 for size in [512,1024]:
  cell=size//2;margin=size//32;sheet=Image.new('RGB',(size,size),(58,68,62));font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',max(10,size//56))
  for i,(v,label) in enumerate(labels):
   im=Image.open(o/(v+'_512.png')).convert('RGB').resize((cell,cell-margin),Image.Resampling.LANCZOS);x=(i%2)*cell;y=(i//2)*cell;sheet.paste(im,(x,y));ImageDraw.Draw(sheet).text((x+size//64,y+cell-margin+1),label,font=font,fill=(233,232,218))
  sheet.save(o/(a+'_contact_'+str(size)+'.png'))
 manifest=json.load(open(o/'manifest.json'));manifest.update(runtime_mesh_count=qa['mesh_count'],dimensions_m=qa['dimensions_m'],bounds_min_m=qa['bounds_min_m'],bounds_max_m=qa['bounds_max_m'],material_slot_count_total=sum(len(x['materials']) for x in qa['components']),budget_target_triangles=json.load(open(R/'recipes'/(a+'.json')))['budget_target_triangles'])
 manifest['files']=[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(o.iterdir()) if p.is_file() and p.name!='manifest.json' and not p.name.endswith('.blend1')]
 (o/'manifest.json').write_text(json.dumps(manifest,indent=2))
 SUMMARY.append({'asset':a,'triangles':manifest['triangles'],'runtime_meshes':qa['mesh_count'],'materials_used':qa['material_count_used'],'material_slots_total':manifest['material_slot_count_total'],'dimensions_m':qa['dimensions_m'],'source_component_count':len(component['components']),'geometry_uv_qa_passed':component['passed'],'visual_status':'author checked actual four-view contact sheet; independent review pending','project_status':'historical assumptions; current project/Unity/cel shader/phone acceptance unverified'})
 for fn,purpose in [(a+'_contact_1024.png','1024四视图审阅联系表'),(a+'_contact_512.png','512四视图审阅联系表'),('hero_1024.png','1024高清棚拍'),(a+'.blend','可编辑Blender源文件'),(a+'.fbx','内嵌纹理FBX'),(a+'.glb','内嵌纹理GLB'),('manifest.json','三角数、材质、UV、尺寸与文件哈希')]:OUTPUTS.append({'path':str(o/fn),'purpose':('磨石' if a=='grindstone' else '织布机')+'：'+purpose})
roundtrip=json.load(open(R/'roundtrip_report.json'));assert roundtrip['passed']
review={'reviewer':'author inspection','scope':'actual Blender images and offline geometry; no independent acceptance claim','grindstone':{'images':['hero_512.png','rear_512.png','front_512.png','side_512.png','grindstone_contact_1024.png'],'findings':['Wheel, frame, operator rest, tray and crank are readable','Directed improvement added supported tool rest and runtime batching','Broad stone face remains very light under soft studio lighting; material is a neutral bridge'],'status':'ready for independent review'},'loom':{'images':['hero_512.png','rear_512.png','front_512.png','side_512.png','loom_contact_1024.png'],'findings':['Loom frame, warp/reed, cloth roll and two treadles are readable in real geometry','Three runtime meshes retain heddle lift and beater swing pivots','31 narrow warp strands may alias at distant icon sizes; no phone/TAA test','2708 triangles exceeds original 2500 planning target by 208'],'status':'ready for independent review'}}
(R/'author_visual_review.json').write_text(json.dumps(review,indent=2))
(R/'delivery_summary.json').write_text(json.dumps({'assets':SUMMARY,'roundtrip_passed':True,'acceptance':'independent review pending; no Unity or target-phone acceptance'},indent=2))
files=[R/'README.md',R/'assumptions.json',R/'roundtrip_report.json',R/'author_visual_review.json',R/'delivery_summary.json']
for d in ['textures','recipes','scripts']:
 files.extend(p for p in (R/d).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
files.append(R/'reference'/'texture_provenance.json');files.append(R/'reference'/'approved_workbench_perspective.png')
files.extend(p for a in ['grindstone','loom'] for p in (R/a/'final').iterdir() if p.is_file() and not p.name.endswith('.blend1'))
# The sample is a useful directed review record, not a counted final asset.
files.extend([R/'grindstone'/'sample_review.json',R/'grindstone'/'sample'/'hero_512.png'])
hashes=[{'file':str(p.relative_to(R)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(files)]
(R/'delivery_manifest.json').write_text(json.dumps({'created_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':hashes},indent=2));files.append(R/'delivery_manifest.json')
zpath=R/'Aether_Loom_Grindstone_Mobile_Art_20261008.zip'
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,'Aether_Loom_Grindstone/'+str(p.relative_to(R)))
with zipfile.ZipFile(zpath) as z:assert z.testzip() is None
OUTPUTS.insert(0,{'path':str(zpath),'purpose':'两件功能道具完整自包含导出包，独立视觉验收待完成'})
OUTPUTS.append({'path':str(R/'delivery_summary.json'),'purpose':'两件资产技术结果与验收边界'})
OUTPUTS.append({'path':str(R/'roundtrip_report.json'),'purpose':'Blender FBX/GLB往返与源文件重开检查'})
p=R/'status.json';d=json.load(open(p));now=datetime.datetime.now(datetime.timezone.utc).isoformat();d.update(state='review',stage='Both export packages passed offline QA; independent visual review pending',stage_zh='磨石与织布机离线技术复检通过，等待独立视觉验收',updated_at_utc=now,heartbeat_at_utc=now,outputs=OUTPUTS,candidate_assets=2,exported_assets=2,completed_assets=0,independent_review_pending=2);q=p.with_suffix('.tmp');q.write_text(json.dumps(d,ensure_ascii=False,indent=2));q.replace(p)
with (R/'events.jsonl').open('a') as f:f.write(json.dumps({'at_utc':now,'event':'technical_qa_passed_review_pending','detail':'2 assets exported and roundtrip-verified; independent visual and current-project runtime acceptance pending','zip_sha256':hashlib.sha256(zpath.read_bytes()).hexdigest()},ensure_ascii=False)+'\n')
print(json.dumps({'zip':str(zpath),'bytes':zpath.stat().st_size,'sha256':hashlib.sha256(zpath.read_bytes()).hexdigest(),'assets':SUMMARY,'state':'review'},ensure_ascii=False))
