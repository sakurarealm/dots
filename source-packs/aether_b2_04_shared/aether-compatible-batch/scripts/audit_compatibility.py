"""Measured geometry envelopes and clearances for the independent prototype kit.

Not a Unity collision, navigation or runtime acceptance test.
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
FIRST=next((p for p in [ROOT.parent/'aether-first-batch',ROOT.parent/'aether-assets'] if (p/'source/town_building_a_frame_bay_v01.blend').exists()),None)
assert FIRST is not None,'Place the reviewed first batch beside this compatibility batch.'

def points(ob):return [ob.matrix_world@v.co for v in ob.data.vertices]
def bbox(ob):
    ps=points(ob);return {'min':[min(p[i] for p in ps) for i in range(3)],'max':[max(p[i] for p in ps) for i in range(3)]}
models={}
for src in (ROOT/'source').glob('*.blend'):
    bpy.ops.wm.open_mainfile(filepath=str(src));bpy.context.view_layer.update()
    models[src.stem]={'bbox':bbox(bpy.data.objects['LOD0_Static']),'vertices':[tuple(p) for p in points(bpy.data.objects['LOD0_Static'])]}
frame=FIRST/'source/town_building_a_frame_bay_v01.blend';bpy.ops.wm.open_mainfile(filepath=str(frame));bpy.context.view_layer.update()
parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('SOURCE_')]
post_bounds=[bbox(o) for o in parts if o.name.startswith('SOURCE_frame_post_')]
tie_bounds=[bbox(o) for o in parts if o.name.startswith('SOURCE_frame_tie_')]
rafters=[o for o in parts if o.name.startswith('SOURCE_frame_rafter_')]
kingposts=[bbox(o) for o in parts if o.name.startswith('SOURCE_frame_kingpost_')]
right_inner=min(b['min'][0] for b in post_bounds if b['min'][0]>0)
left_inner=max(b['max'][0] for b in post_bounds if b['max'][0]<0)
front_inside=max(b['max'][1] for b in post_bounds if b['max'][1]<0)
back_inside=min(b['min'][1] for b in post_bounds if b['min'][1]>0)
tie_bottom=min(b['min'][2] for b in tie_bounds);tie_top=max(b['max'][2] for b in tie_bounds)
floor=models['town_building_floor_bay_v01']['bbox'];side=models['town_building_side_infill_v01']['bbox'];gable=models['town_building_gable_screen_v01']
planes={}
for ob in rafters:
    ps=points(ob);side_key=1 if sum(p.x for p in ps)>0 else -1
    n=ob.matrix_world.to_3x3().col[0].normalized()
    if n.z<0:n=-n
    c=min(n.dot(p) for p in ps)
    planes[side_key]=(n,c)
mount_base=tie_top;mount_y=-.285
roof_gaps=[]
for xyz in gable['vertices']:
    p=Vector(xyz)+Vector((0,mount_y,mount_base));n,c=planes[1 if p.x>=0 else -1]
    roof_gaps.append(c-n.dot(p))
front_king_max_y=max(b['max'][1] for b in kingposts if b['max'][1]<0)
report={
 'reference_frame':'reviewed first-batch town_building_a_frame_bay_v01',
 'actual_column_inside_span_m':right_inner-left_inner,
 'floor_left_clearance_m':floor['min'][0]-left_inner,
 'floor_right_clearance_m':right_inner-floor['max'][0],
 'floor_repeat_depth_m':floor['max'][1]-floor['min'][1],
 'floor_repeats_1m_have_positive_aabb_overlap':False,
 'actual_tie_underside_m':tie_bottom,
 'actual_deck_surface_m':floor['max'][2],
 'actual_clearance_height_below_tie_m':tie_bottom-floor['max'][2],
 'side_post_clear_gap_m':back_inside-front_inside,
 'side_front_clearance_m':side['min'][0]-front_inside,
 'side_back_clearance_m':back_inside-side['max'][0],
 'side_install_base_m':.10,
 'side_top_to_tie_underside_clearance_m':tie_bottom-(.10+side['max'][2]),
 'gable_install_base_m':mount_base,
 'gable_mount_y_m':mount_y,
 'gable_min_clearance_to_underside_rafter_plane_m':min(roof_gaps),
 'gable_front_clearance_to_front_kingpost_m':(mount_y+gable['bbox']['min'][1])-front_king_max_y,
 'scope':'Geometry envelope/plane checks only. No Unity import, collision, navigation, character IK, or gameplay test.',
 'not_a_complete_building':True,
 'production_asset_gap_claim':False
}
assert report['floor_left_clearance_m']>0 and report['floor_right_clearance_m']>0
assert abs(report['floor_repeat_depth_m']-1.)<1e-6
assert floor['min'][1]>=-.500001 and floor['max'][1]<=.500001
assert report['actual_clearance_height_below_tie_m']>=1.90
assert report['side_front_clearance_m']>0 and report['side_back_clearance_m']>0
assert report['side_top_to_tie_underside_clearance_m']>0
assert report['gable_min_clearance_to_underside_rafter_plane_m']>0
assert report['gable_front_clearance_to_front_kingpost_m']>0
report['measured_envelope_pass']=True
(ROOT/'reports/compatibility-envelope-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('COMPATIBILITY_ENVELOPE_PASS',json.dumps(report,ensure_ascii=False))
