"""Run Blender to extract byte-identical embedded source PNGs for a portable re-render.
/usr/bin/blender -b -t 2 --python scripts/extract_style_sources.py
"""
import bpy,json,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1];cfg=json.loads((ROOT/'styles/style-recipes.json').read_text());bpy.ops.wm.open_mainfile(filepath=str(ROOT/'styles/source/barrel_six_styles_library.blend'));out=ROOT/'styles/textures';out.mkdir(exist_ok=True);records=[]
for st in cfg['styles']:
 im=bpy.data.images['T_Style_'+st['id']+'_Wood_Albedo'];assert im.packed_file;data=bytes(im.packed_file.data);p=out/st['texture'];p.write_bytes(data);records.append({'id':st['id'],'file':str(p),'sha256':hashlib.sha256(data).hexdigest(),'dimensions':list(im.size)})
(ROOT/'styles/reports/extracted-source-check.json').write_text(json.dumps(records,indent=2));print(json.dumps(records,indent=2))
