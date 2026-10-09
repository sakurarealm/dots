import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=[]
for src in sorted((ROOT/'source').glob('*.blend')):
    bpy.ops.wm.open_mainfile(filepath=str(src));images=[]
    for im in bpy.data.images:
        if im.type=='RENDER_RESULT' or not im.filepath:continue
        assert im.filepath.startswith('//../textures/'),(src.name,im.name,im.filepath)
        resolved=Path(bpy.path.abspath(im.filepath));assert resolved.is_file(),resolved
        assert im.packed_file is not None,im.name
        images.append({'name':im.name,'path':im.filepath,'packed':True,'external_relative_path_resolves':True})
    rows.append({'asset_id':src.stem,'images':images,'pass':True})
(ROOT/'reports/texture-path-report.json').write_text(json.dumps(rows,indent=2))
print('TEXTURE_PATHS_PASS',[(r['asset_id'],len(r['images'])) for r in rows])
