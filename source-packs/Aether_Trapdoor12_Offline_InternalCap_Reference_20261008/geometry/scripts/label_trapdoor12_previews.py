"""Readable actual endpoint contact sheets and same-camera pixel comparison."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops,ImageStat
import json,hashlib
OUT=Path(__file__).resolve().parents[1]/'next_trapdoor12'
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
title=ImageFont.truetype(FONT,30);font=ImageFont.truetype(FONT,24);small=ImageFont.truetype(FONT,21)
FACING=('SOUTH','WEST','NORTH','EAST')

def contact(raw,stem,subtitle):
    im=Image.open(OUT/'previews'/raw).convert('RGB');page=Image.new('RGB',(2220,2430),'#edf1e9');d=ImageDraw.Draw(page)
    d.text((30,20),'TRAPDOOR12 / 16 METADATA ENDPOINTS / WHOLE BACKED CAPS ONLY',font=title,fill='#263f34')
    d.text((30,65),subtitle,font=font,fill='#3f594b')
    for meta in range(16):
        col,row=meta%4,meta//4;cx=1024+(col-1.5)*1.5*2048/6.8;cy=1024-(1.5-row)*1.5*2048/6.8
        tile=im.crop((round(cx-220),round(cy-220),round(cx+220),round(cy+220)))
        x=70+col*535;y=120+row*540;page.paste(tile,(x,y))
        d.text((x+220,y+460),f'META {meta:02d}: {FACING[meta&3]} / {"TOP" if meta&4 else "BOTTOM"}',font=font,fill='#263f34',anchor='mm')
        d.text((x+220,y+500),f'{"OPEN" if meta&8 else "CLOSED"} / 72 raw -> 56 candidate tri',font=small,fill='#3f594b',anchor='mm')
    d.text((30,2310),'16 endpoint records, 6 occupancies: closed ignores facing; open ignores upper. No animated hinge/sweep evidence',font=small,fill='#263f34')
    d.text((30,2346),'3/16m thick four-hole render; original collider is a solid sheet. Holes do not establish physical passage',font=small,fill='#3f594b')
    d.text((30,2382),'Original overlap surfaces retained; one shared iron v02 offline material. No new art, native or phone approval',font=small,fill='#3f594b')
    p=OUT/'previews'/(stem+'.png');page.save(p);return p

def comparison():
    im=Image.open(OUT/'previews/trapdoor12_raw_candidate_closed_open_comparison_raw.png').convert('RGB')
    page=Image.new('RGB',(1320,1510),'#edf1e9');d=ImageDraw.Draw(page)
    d.text((30,20),'TRAPDOOR12 / RAW VS CAP-ONLY ENDPOINTS',font=title,fill='#263f34')
    d.text((30,65),'Same iron v02 / same camera rig / original crossing overlap retained',font=small,fill='#3f594b')
    for i,(meta,mode) in enumerate(((0,'raw'),(0,'candidate'),(8,'raw'),(8,'candidate'))):
        col,row=i%2,i//2;cx=640+(col-.5)*1.7*1280/3.9;cy=640-(.5-row)*1.7*1280/3.9
        tile=im.crop((round(cx-245),round(cy-245),round(cx+245),round(cy+245)))
        x=70+col*600;y=120+row*610;page.paste(tile,(x,y))
        d.text((x+245,y+520),f'META {meta:02d} {"OPEN" if meta else "CLOSED"} / {mode.upper()}',font=font,fill='#263f34',anchor='mm')
        d.text((x+245,y+560),f'{72 if mode=="raw" else 56} tri / solid-sheet collision unchanged',font=small,fill='#3f594b',anchor='mm')
    d.text((30,1390),'Cap-only removes eight wholly backed component faces; no welded closed union or retriangulation',font=small,fill='#263f34')
    d.text((30,1430),'Original native interaction, shader, collision/raycast and real phone behavior remain untested',font=small,fill='#3f594b')
    p=OUT/'previews/trapdoor12_raw_candidate_closed_open_contact.png';page.save(p);return p

def comp(a,b):
    diff=ImageChops.difference(a,b);stats=ImageStat.Stat(diff)
    return {'MAD_RGB_0_255':sum(stats.mean)/3,'max_channel_difference':max(v[1] for v in diff.getextrema()),
        'pixels_any_channel_difference_gt2':sum(max(p)>2 for p in diff.getdata())}

def main():
    paths=[contact('trapdoor12_candidate_front_raw.png','trapdoor12_candidate_front_contact','512 unchanged iron v02 / front-high view / all16 actual metadata endpoints'),
        contact('trapdoor12_candidate_reverse_under_raw.png','trapdoor12_candidate_reverse_under_contact','512 unchanged iron v02 / reverse-under view / four openings and thickness retained'),
        contact('trapdoor12_candidate_front256_raw.png','trapdoor12_candidate_front256_contact','256 unchanged iron v02 / same front camera / offline texture projection only'),comparison()]
    a=Image.open(OUT/'previews/trapdoor12_raw_front_raw.png').convert('RGB');b=Image.open(OUT/'previews/trapdoor12_candidate_front_raw.png').convert('RGB')
    c=Image.open(OUT/'previews/trapdoor12_candidate_front256_raw.png').convert('RGB')
    result={'raw_candidate_same_camera':comp(a,b),'candidate512_256_same_camera':comp(b,c),
        'raw_overlap_darkening_retained_not_finished_art_approval':True,'new_material_art_approvals':0,
        'contact_image_sha256':{str(p.relative_to(OUT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
        'native_integrated':False,'full_block_accepted':False,'mobile_pass':False}
    (OUT/'reports/trapdoor12-labeled-views-and-pixel-comparison.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result))

if __name__=='__main__':main()
