import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'source/town_building_side_infill_v01.blend';bpy.ops.wm.open_mainfile(filepath=str(p));bpy.context.view_layer.update()

def bounds(ob):
    pts=[ob.matrix_world@v.co for v in ob.data.vertices]
    return {'min':[min(p[i] for p in pts) for i in range(3)],'max':[max(p[i] for p in pts) for i in range(3)]}
brace=bounds(bpy.data.objects['SOURCE_side_back_brace'])
boards=[bounds(o) for o in bpy.context.scene.objects if o.name.startswith('SOURCE_side_vertical_plank_')]
rails=[(o.name,bounds(o)) for o in bpy.context.scene.objects if o.name.startswith('SOURCE_side_back_rail_')]
board_back=max(b['max'][1] for b in boards)
gap=brace['min'][1]-board_back
contacts=[]
for name,r in rails:
    overlap=[min(brace['max'][i],r['max'][i])-max(brace['min'][i],r['min'][i]) for i in range(3)]
    assert all(x>0 for x in overlap),(name,overlap)
    contacts.append({'rail':name,'positive_aabb_overlap_xyz_m':overlap,'scope':'Bounding-box joint enclosure, not solid-volume structural validation.'})
assert abs(gap)<1e-6,gap
report={'asset_id':p.stem,'attempt':2,'brace_front_to_board_back_gap_m':gap,'end_joint_enclosure_checks':contacts,'exterior_rear_faces_are_offset_not_coplanar':abs(brace['max'][1]-rails[0][1]['max'][1])>1e-4,'pass':True,'scope':'Saved-source placement check; independent second visual review still required. No Unity/mobile acceptance.'}
assert report['exterior_rear_faces_are_offset_not_coplanar']
(ROOT/'reports/side-brace-connection-report.json').write_text(json.dumps(report,indent=2))
print('SIDE_BRACE_CONNECTION_PASS',json.dumps(report))
