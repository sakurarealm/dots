"""Actual GLB round-trip, decoded embedded PNG and source-array verification."""
from pathlib import Path
import json,hashlib,resource
import numpy as np
from render_actual_glb import read_glb
ROOT=Path(__file__).resolve().parents[1];records=[]
for path in sorted((ROOT/'models').glob('*.glb')):
    if path.stem.endswith('_editable_parts'):continue
    mesh,atlas,doc,orm=read_glb(path);npz=np.load(path.with_suffix('.npz'));groups=[]
    for mid in range(3):
        ids=np.where(npz['material']==mid)[0];groups.extend(ids.tolist())
    groups=np.asarray(groups);checks={'positions_equal_source':bool(np.array_equal(mesh['position'],npz['position'][groups])),'normals_equal_source':bool(np.array_equal(mesh['normal'],npz['normal'][groups])),'uv_equal_source':bool(np.array_equal(mesh['uv'],npz['uv'][groups])),'material_partition_equal_source':bool(np.array_equal(mesh['material'],npz['material'][groups])),'triangle_budget_6000':len(mesh['position'])<=6000,'material_budget_3':len(doc['materials'])<=3,'texture_1024':atlas.size==(1024,1024),'finite_uv':bool(np.isfinite(mesh['uv']).all()),'uv_range_0_1':bool((mesh['uv']>=0).all() and (mesh['uv']<=1).all())}
    assert all(checks.values()),(path.name,checks)
    records.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'triangles':len(mesh['position']),'materials':len(doc['materials']),'images':len(doc['images']),'atlas_dimensions':list(atlas.size),'orm_dimensions':list(orm.size) if orm is not None else None,'checks':checks})
result={'actual_files_verified':len(records),'all_checks_pass':True,'scope':'Numeric GLB re-read plus actual embedded atlas decode. Not Blender/Unity import or runtime performance validation.','rss_peak_kib':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,'records':records};(ROOT/'validation/glb_roundtrip_validation.json').write_text(json.dumps(result,indent=2));print(json.dumps({'actual_files_verified':len(records),'all_checks_pass':True,'rss_peak_kib':result['rss_peak_kib']},indent=2))
