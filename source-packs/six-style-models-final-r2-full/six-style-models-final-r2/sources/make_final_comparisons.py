"""Arrange current actual-GLB preview PNGs; does not repaint or regenerate models."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
STYLES=[('oil_handpaint','Oil hand-paint','Broad bristle pigment'),('genshin_cel','Cel candidate','Cleaner color + quantized preview light'),('endfield_pbr_anime','PBR anime candidate','Material-class albedo + metallic/roughness'),('ghibli_poster','Poster / gouache candidate','Flat pigment planes; r3 repaint'),('bloomwalker_painterly','Soft painterly candidate','Soft glaze marks; r3 repaint'),('bk_project_candidate','BK project candidate','Uncalibrated artisan palette + thin paint')]
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f=ImageFont.truetype(FONT,17);fb=ImageFont.truetype(BOLD,23);ft=ImageFont.truetype(BOLD,30)
records=[]
for prop,title in [('bread_cart','Bread cart'),('tea_kiosk','Tea kiosk'),('mailbox_bench','Mailbox + bench')]:
 sheet=Image.new('RGB',(1368,1254),(244,242,235));d=ImageDraw.Draw(sheet);d.text((24,18),title+' | Six direction candidates',font=ft,fill=(39,43,47));d.text((24,59),'Current actual GLB meshes + embedded textures, software 3D previews. Art approval pending.',font=f,fill=(72,77,79))
 cells=[]
 for i,(style,label,description) in enumerate(STYLES):
  x=24+(i%3)*448;y=96+(i//3)*552;p=ROOT/'previews'/f'{style}_{prop}.png';original=Image.open(p).convert('RGB');im=original.resize((424,477),Image.Resampling.LANCZOS);sheet.paste(im,(x,y));d.text((x,y+483),label,font=fb,fill=(35,41,46));d.text((x,y+513),description,font=f,fill=(68,74,78));cells.append({'style':style,'preview':str(p.relative_to(ROOT)),'source_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'paste_box':[x,y,x+424,y+477]})
 d.text((24,1215),'CPU style-lighting logic is not a supplied Unity/NPR shader. BK is proposed; no named-game fidelity claim.',font=f,fill=(65,71,77))
 out=ROOT/'comparisons'/f'{prop}_six_directions_final_r2.png';sheet.save(out);records.append({'file':str(out.relative_to(ROOT)),'dimensions':list(sheet.size),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'cells':cells})
(ROOT/'validation/final_comparisons_r2.json').write_text(json.dumps({'scope':'Layout-only composition from the 18 current preview PNGs. No image-generated prop replacement or painting. Labels are candidate descriptions, not art acceptance.','font':'DejaVu Sans / DejaVu Sans Bold; fonts not bundled','records':records},indent=2));print(json.dumps({'sheets':len(records),'files':[x['file'] for x in records]},indent=2))
