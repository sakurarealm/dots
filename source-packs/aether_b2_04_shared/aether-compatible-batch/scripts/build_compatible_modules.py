"""Three original compatibility samples for the reviewed 1m A-frame bay.

No repository edits or complete building. Existing generic components in the
2026-10-04 handoff were checked; these are size/style adaptations for this
independent prototype, not claims of missing current production assets.
"""
import bpy,bmesh,json,math,hashlib,time
from pathlib import Path
from mathutils import Vector
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_library as L
ROOT=L.ROOT
FIRST=next((p for p in [ROOT.parent/'aether-first-batch',ROOT.parent/'aether-assets'] if (p/'textures/T_Wood_Warm_BaseColor.png').exists()),None)
assert FIRST is not None,'Place the shared reviewed palette beside this compatibility batch.'
IDS=('town_building_floor_bay_v01','town_building_side_infill_v01','town_building_gable_screen_v01')

def finish(parts,root):
    lods=L.add_lods(L.join_baked(parts,'LOD0_Static',root),root)
    return lods

def floor_bay(root,m):
    w=m['MAT_Wood_Warm'];b=m['MAT_Metal_Brass'];p=[]
    for x in [-1.4,0,1.4]:p.append(L.cube('floor_joist_'+str(x),(x,0,.0325),(.10,1.0,.065),w,root,.005,dark=True))
    for i in range(8):p.append(L.cube('floor_deck_'+str(i),(0,(i-3.5)*.125,.0825),(3.5,.119,.035),w,root,.004))
    for x in [-1.4,1.4]:
        for y in [-.4375,.4375]:p.append(L.cylinder('floor_flush_pin_'+str(x)+str(y),(x,y,.098),.010,.004,b,root,8))
    lods=finish(p,root)
    cols=[L.collider('COL_Deck',(0,0,.05),(3.5,1.0,.10),root)]
    anchors=[L.empty('ANCHOR_SnapFront',root,(0,-.5,0)),L.empty('ANCHOR_SnapBack',root,(0,.5,0)),L.empty('ANCHOR_WalkSurface',root,(0,0,.10))]
    return lods,cols,anchors,{'role':'repeatable_supported_floor_sample','body_width_m':3.5,'repeat_depth_m':1.,'deck_surface_height_m':.10,'a_frame_column_inside_span_m':3.62,'horizontal_clearance_each_side_m':.06,'nominal_headroom_below_tie_m':1.905,'reference_requirement':'2026-10-03 architectural list: long timber floorboards','current_production_gap_claim':False,'runtime_walkability':'not_tested'}

def side_infill(root,m):
    w=m['MAT_Wood_Warm'];b=m['MAT_Metal_Brass'];p=[]
    for z in [.0325,1.8675]:p.append(L.cube('side_dark_cap_'+str(z),(0,0,z),(.6,.075,.065),w,root,.004,dark=True))
    for i in range(6):p.append(L.cube('side_vertical_plank_'+str(i),((i-2.5)*.10,-.020,.95),(.094,.035,1.77),w,root,.004))
    for z in [.24,1.66]:p.append(L.cube('side_back_rail_'+str(z),(0,.0075,z),(.56,.020,.075),w,root,.004))
    p.append(L.beam('side_back_brace',(-.23,.0125,.24),(.23,.0125,1.66),.050,.030,w,root))
    for x in [-.22,.22]:
        for z in [.24,1.66]:p.append(L.cylinder('side_flush_pin_'+str(x)+str(z),(x,-.036,z),.008,.003,b,root,8,'Y'))
    lods=finish(p,root)
    cols=[L.collider('COL_Infill',(0,0,.95),(.60,.075,1.90),root)]
    anchors=[L.empty('ANCHOR_SnapLeft',root,(-.3,0,0)),L.empty('ANCHOR_SnapRight',root,(.3,0,0)),L.empty('ANCHOR_AttachPlane',root,(0,0,.95))]
    return lods,cols,anchors,{'role':'side_wall_infill_compatibility_sample','body_width_m':.60,'body_height_m':1.90,'body_depth_m':.075,'fits_clear_gap_between_bay_posts_m':.62,'end_clearance_each_m':.01,'mount_above_floor_m':.10,'installed_top_height_m':2.0,'tie_underside_m':2.005,'existing_candidate':'handoff town_wall_panel is 1m wide x2.4m tall, incompatible with this specific prototype bay','current_production_gap_claim':False,'not_a_complete_wall_or_building':True,'brace_rework':'attempt2: front face touches board back, endpoints embedded in back rails, rear faces offset to avoid coplanar black patches'}

def tapered_plank(name,left,right,bottom,top_left,top_right,mat,root):
    yf,yb=-.0425,.0125
    v=[(left,yf,bottom),(right,yf,bottom),(right,yb,bottom),(left,yb,bottom),(left,yf,top_left),(right,yf,top_right),(right,yb,top_right),(left,yb,top_left)]
    f=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    cx=(left+right)/2;cz=(bottom+max(top_left,top_right))/2
    v=[(x-cx,y+.015,z-cz) for x,y,z in v]
    ob=L.mesh_object(name,v,f,mat,root,2);ob.location=(cx,-.015,cz)
    mod=ob.modifiers.new('Small_craft_chamfer','BEVEL');mod.width=.0025;mod.segments=1
    bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name);ob.select_set(False)
    L.repair_uv(ob.data);L.wood_palette_uv(ob)
    return ob

def gable_screen(root,m):
    w=m['MAT_Wood_Warm'];b=m['MAT_Metal_Brass'];p=[]
    p.append(L.cube('gable_bottom_cap',(0,0,.035),(3.5,.085,.070),w,root,.004,dark=True))
    profile=lambda x:1.80-(1.62/1.75)*abs(x)
    for i in range(14):
        left=-1.75+i*.25+.003;right=left+.244
        p.append(tapered_plank('gable_slat_'+str(i),left,right,.070,profile(left),profile(right),w,root))
    p.append(L.cube('gable_back_tie',(0,.0275,.13),(3.5,.030,.10),w,root,.004,dark=True))
    p.append(L.cube('gable_center_back_support',(0,.0275,.92),(.07,.030,1.70),w,root,.004,dark=True))
    for x in [-1.25,-.50,.50,1.25]:p.append(L.cylinder('gable_flush_pin_'+str(x),(x,-.0405,.13),.011,.004,b,root,8,'Y'))
    lods=finish(p,root)
    # Collision proxy is a small base and sloped boards, not an opaque box
    # extending across the entire A-frame interior.
    cols=[L.collider('COL_GableBase',(0,0,.035),(3.5,.085,.07),root)]
    for side in [-1,1]:
        c=L.beam('COL_GableSlope_'+str(side),(side*1.75,0,.18),(0,0,1.80),.09,.085,None,root);c.hide_render=True;c.display_type='WIRE';c['aether_collider']='oriented_box_proxy';cols.append(c)
    anchors=[L.empty('ANCHOR_AttachBase',root,(0,0,0)),L.empty('ANCHOR_Apex',root,(0,0,1.80))]
    return lods,cols,anchors,{'role':'triangular_gable_infill_screen_sample','body_width_m':3.5,'nominal_peak_height_m':1.8,'mount_base_height_in_a_frame_m':2.195,'mount_y_inside_front_frame_m':-.285,'upper_perimeter_has_ventilation_clearance':True,'reference_requirement':'2026-10-03 A-frame architecture: vertical timber infill','current_production_gap_claim':False,'not_a_complete_house':True,'collision_proxy_coverage':'partial sample proxies only, not runtime containment'}

def main():
    builders=(floor_bay,side_infill,gable_screen);reports=[]
    requested=set(sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else set()
    for asset,builder in zip(IDS,builders):
        if requested and asset not in requested:continue
        bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
        scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1.;m=L.textures()
        scene.world=bpy.data.worlds.new('SampleWorld');scene.world.use_nodes=True
        for f in (ROOT/'textures').glob('*.png'):
            original=FIRST/'textures'/f.name
            assert hashlib.sha256(f.read_bytes()).digest()==hashlib.sha256(original.read_bytes()).digest(),f
        root=L.empty(asset);root['aether_source']='Original Blender compatibility sample for independently reviewed 1m A-frame';root['aether_units']='meters'
        lods,cols,anchors,notes=builder(root,m)
        checks=L.audit(lods)
        assert all(c['non_manifold_edges']==0 and c['loose_vertices']==0 and c['zero_area_faces']==0 and c['finite_coordinates'] and c['uv_layers']>0 and c['material_slots']<=3 for c in checks),checks
        L.export(root,lods,[],cols,anchors)
        for image in bpy.data.images:
            if image.filepath and Path(image.filepath).suffix=='.png':image.filepath='//../textures/'+Path(image.filepath).name
        for c in cols:c.hide_set(True)
        for o in lods[1:]:o.hide_set(True)
        source=ROOT/'source'/(asset+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(source),relative_remap=False)
        bpy.ops.wm.open_mainfile(filepath=str(source));root=bpy.data.objects[asset];visual=[bpy.data.objects['LOD0_Static']]
        report={'asset_id':asset,'units':'meters','reference_commit':'0956b0777cf007a7a3b1ed799f7ade777f14c80d','dimensions_blender_xyz_m':L.bounds(visual),'pivot_m':list(root.location),'origin_convention':'bottom-center','lod_meshes':checks,'lod0_total_triangles':checks[0]['triangles'],'source_reopen_pass':True,'shared_texture_bytes_match_reviewed_first_batch':True,'source_texture_paths':'//../textures/','source_notes':notes,'anchors':[{'name':o.name,'position_blender_xyz_m':list(o.location)} for o in root.children_recursive if o.name.startswith('ANCHOR_')],'status':'technical_source_pass_pending_export_roundtrip_visual_unity','unity_import_test':'not_run','unity_runtime_test':'not_run'}
        (ROOT/'reports'/(asset+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2));reports.append(report)
        print('BUILD_COMPATIBLE',asset,report['dimensions_blender_xyz_m'],flush=True)
    reports=[json.loads((ROOT/'reports'/(asset+'.json')).read_text()) for asset in IDS if (ROOT/'reports'/(asset+'.json')).exists()]
    (ROOT/'reports/samples-manifest.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
    print('BUILD_COMPATIBLE_PASS')

if __name__=='__main__':main()
