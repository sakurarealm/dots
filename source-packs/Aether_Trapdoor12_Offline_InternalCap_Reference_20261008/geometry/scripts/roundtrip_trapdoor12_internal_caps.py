"""Guarded actual48 endpoint-format imports, never native/interaction/phone QA."""
import bpy,json,sys,hashlib
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import ROOT
from build_shapes import to_unity
from verify_trapdoor12_internal_caps import check_arrays
OUT=ROOT/'next_trapdoor12'

def main():
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'source/iron_trapdoor12_internal_cap_reference.blend'))
    frames={o.name:o.matrix_world.copy() for o in bpy.context.scene.objects if o.name.startswith('TRAPDOOR12_')}
    rows={r['object_name']:r for r in json.loads((OUT/'reports/trapdoor12-actual-mesh-snapshots.json').read_text())['actual_state_and_comparison_meshes']}
    source=json.loads((OUT/'reports/trapdoor12-byte-selfcheck.json').read_text())['source_cases'];imports=[]
    for mode in ('raw','candidate'):
        for fmt in (('glb',) if mode=='raw' else ('glb','fbx')):
            path=OUT/'exports'/f'iron_trapdoor12_{mode}16_endpoint_reference_atlas.{fmt}'
            bpy.ops.wm.read_factory_settings(use_empty=True)
            if fmt=='fbx':bpy.ops.import_scene.fbx(filepath=str(path),use_custom_normals=True)
            else:bpy.ops.import_scene.gltf(filepath=str(path))
            bpy.context.view_layer.update();objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(objects)==16;cases=[]
            for ob in objects:
                row=rows[ob.name];me=ob.data;me.calc_loop_triangles();assert len(me.materials)==len(me.uv_layers)==1
                convert=frames[ob.name].inverted()@ob.matrix_world;coords=[to_unity(convert@v.co) for v in me.vertices]
                err=max(abs(v-round(v*16)/16) for p in coords for v in p);assert err<2e-6
                coords=[tuple(round(v*16)/16 for v in p) for p in coords];pts=[];ns=[];uv=[];tris=[]
                for triangle in me.loop_triangles:
                    ps=[coords[i] for i in triangle.vertices];n=(Vector(ps[1])-Vector(ps[0])).cross(Vector(ps[2])-Vector(ps[0])).normalized();ids=[]
                    for j,i in enumerate(triangle.vertices):
                        ids.append(len(pts));pts.append(coords[i]);ns.append(tuple(n));uv.append(tuple(me.uv_layers[0].data[triangle.loops[j]].uv))
                    tris.append(ids)
                got=check_arrays(pts,tris,ns,uv,row)[0]
                assert got['canonical_surface_corner_sha256']==source[ob.name]['canonical_surface_corner_sha256']
                got.update(object_name=ob.name,max_import_grid_error_m=err,known_grid_m=1/16,
                    actual_imported_mesh_vertices=len(me.vertices),expanded_triangle_corners=len(pts),
                    source_hash_matches_after_verified_known_grid_float_normalization=True,
                    FBX_other_quad_diagonal_not_literal_crossformat_triangle_equality=True)
                cases.append(got)
            imports.append({'mode':mode,'format':fmt,'file_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'cases':cases})
    (OUT/'reports/trapdoor12-Blender-export-roundtrip.json').write_text(json.dumps({'author_self_check_not_independent_review':True,
        'actual_format_state_imports':48,'imports':imports,'native_interaction_collision_shader_or_phone_pass':False},indent=2))
    print('RESULT48 actual Trapdoor12 format endpoint imports pass',flush=True)

if __name__=='__main__':main()
