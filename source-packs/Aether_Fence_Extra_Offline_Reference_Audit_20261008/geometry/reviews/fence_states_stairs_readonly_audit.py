"""Independent added-evidence audit. Reads source bytes; never starts Blender/Unity."""
import collections
import io
import json
import math
from pathlib import Path
import zstandard
from PIL import Image, ImageChops
from blend_readonly_reader import BlendReader
import oak_fence_readonly_audit as base

ROOT = Path(__file__).resolve().parents[1]


def manual_fence_boxes(mask):
    boxes = [((.375, 0., .375), (.625, 1., .625))]
    for bit, axis, low, high in ((0, 2, .5, 1.), (1, 0, 0., .5),
                                (2, 2, 0., .5), (3, 0, .5, 1.)):
        if mask & (1 << bit):
            for bottom, top in ((.375, .625), (.75, 1.)):
                lo, hi = [.4375, bottom, .4375], [.5625, top, .5625]
                lo[axis], hi[axis] = low, high
                boxes.append((tuple(lo), tuple(hi)))
    return boxes


def expected_axes(normal_axis, grain_axis):
    axes = {0: (2, 1), 1: (0, 2), 2: (0, 1)}[normal_axis]
    if grain_axis == 0 and normal_axis != 0:
        axes = {1: (2, 0), 2: (1, 0)}[normal_axis]
    if grain_axis == 2 and normal_axis != 2:
        axes = {0: (1, 2), 1: (0, 2)}[normal_axis]
    return axes


def expected_uv(point, normal_axis, grain_axis, origin=(0, 0, 0), mode='world_directional'):
    axes = ({0: (2, 1), 1: (0, 2), 2: (0, 1)}[normal_axis]
            if mode == 'native_projection_approx' else expected_axes(normal_axis, grain_axis))
    offset = (0, 0, 0) if mode == 'local_reset' else origin
    return tuple((point[a]+offset[a])/2 for a in axes)


def source_mesh_audit(obj, boxes, origin=(0, 0, 0), mode='world_directional'):
    mesh = obj['mesh']
    positions = [(p[0], p[2], -p[1]) for p in mesh['positions']]
    faces = mesh['faces']
    edges, directions = collections.Counter(), collections.Counter()
    area = volume = 0.
    axis_fail = uv_fail = loop_checks = 0
    endpoints = collections.defaultdict(dict)
    layer = mesh['uv']['ReviewUV_2mRepeat_RailDirectional']
    for face_index, face in enumerate(faces):
        ps = [positions[i] for i in face]
        sum_cross = [0., 0., 0.]
        for p, q in zip(ps, ps[1:]+ps[:1]):
            cross = base.cross(p, q)
            for a in range(3):
                sum_cross[a] += cross[a]
            edges[tuple(sorted((p, q)))] += 1
            directions[(p, q)] += 1
        length = math.sqrt(base.dot(sum_cross, sum_cross))
        assert length > 1e-12
        normal = tuple(x/length for x in sum_cross)
        normal_axis = max(range(3), key=lambda a: abs(normal[a]))
        if abs(normal[normal_axis]) < .999999:
            axis_fail += 1
        area += length/2
        # Newell/polygon integration handles supplied coplanar concave n-gons;
        # treating every fan triangle as positive area would overcount them.
        volume += base.dot(ps[0], sum_cross)/6
        center = [sum(p[a] for p in ps)/len(ps) for a in range(3)]
        grain = (0 if center[0] < .375-1e-6 or center[0] > .625+1e-6 else
                 2 if center[2] < .375-1e-6 or center[2] > .625+1e-6 else 1)
        start = mesh['face_offsets'][face_index]
        for index, point in enumerate(ps):
            actual = layer[start+index]
            expected = expected_uv(point, normal_axis, grain, origin, mode)
            loop_checks += 1
            if max(abs(actual[a]-expected[a]) for a in range(2)) > 1e-6:
                uv_fail += 1
            if normal_axis != 0 and point[0] in (0., 1.):
                # Actual exposed side/top/bottom loop vertices at a cell join;
                # end caps are excluded because their normals face each other.
                key = (point[1], point[2], normal_axis, int(round(normal[normal_axis])))
                endpoints[point[0]][key] = actual
    expected_low = [min(lo[a] for lo, hi in boxes) for a in range(3)]
    expected_high = [max(hi[a] for lo, hi in boxes) for a in range(3)]
    bounds = [[min(p[a] for p in positions) for a in range(3)],
              [max(p[a] for p in positions) for a in range(3)]]
    result = {'object': obj['name'], 'vertices': len(positions), 'polygons': len(faces),
        'triangles_from_polygon_corner_count': sum(len(face)-2 for face in faces),
        'bounds': bounds, 'expected_bounds_match': bounds == [expected_low, expected_high],
        'surface_area_m2': area, 'signed_volume_m3': volume,
        'coordinate_welded_non_two_incidence_edges': sum(count != 2 for count in edges.values()),
        'edge_orientation_mismatches': sum(directions[(p, q)] != directions[(q, p)] for p, q in edges),
        'non_axis_aligned_polygons': axis_fail, 'material_slots': mesh['material_slots'],
        'uv_layer_names': list(mesh['uv']), 'uv_loop_checks': loop_checks,
        'uv_loop_mismatches': uv_fail,
        'source_object_scale': list(obj['scale']), 'source_object_rotation': list(obj['rotation'])}
    return result, endpoints


def preview_comparison(a, b):
    first = Image.open(a).convert('RGB')
    second = Image.open(b).convert('RGB')
    hist = ImageChops.difference(first, second).histogram()
    return {'MAD_RGB255': sum((i % 256)*count for i, count in enumerate(hist))/(first.width*first.height*3),
            'pixels_any_channel_difference_gt2': sum(any(abs(x-y) > 2 for x, y in zip(p, q))
                for p, q in zip(first.getdata(), second.getdata()))}


def main():
    result = {'scope': 'Independent source-byte/UV arithmetic checks and actual existing-image inspection',
              'blender_executed': False, 'engine_executed': False, 'device_test': False,
              'fence_states': [], 'fence_chains': [], 'fence_joins': {}, 'images': {},
              'artifact_sha256': {}, 'stairs': {}}
    source = ROOT/'source/oak_fence_connection_phase_reference.blend'
    reader = BlendReader(source)
    objects = reader.mesh_objects()
    shared = ROOT.parent/'materials_a/textures/oak_planks/candidate_512/basecolor.png'
    result['fence_reference_exact_shared_texture_packed'] = shared.read_bytes() in reader.raw
    result['artifact_sha256'][str(source.relative_to(ROOT))] = base.sha(source)
    for obj in objects:
        if obj['name'].startswith('STATE_'):
            mask = int(obj['name'][6:], 2)
            check, _ = source_mesh_audit(obj, manual_fence_boxes(mask))
            check.update({'mask': mask, 'expected_volume_matches': abs(check['signed_volume_m3']-(.0625+.0234375*mask.bit_count())) < 1e-8,
                'expected_area_matches': abs(check['surface_area_m2']-(1.125+.5625*mask.bit_count())) < 1e-8,
                'visual_coverage': 'Actually reviewed in one top/oblique contact-sheet angle'})
            result['fence_states'].append(check)
    modes = ('local_reset', 'world_directional', 'native_projection_approx')
    for mode in modes:
        end_sets = []
        for x in range(4):
            name = mode+'_cell_'+str(x)
            obj = next(o for o in objects if o['name'] == name)
            mask = 8 if x == 0 else 2 if x == 3 else 10
            check, endpoints = source_mesh_audit(obj, manual_fence_boxes(mask), (x, 0, 0), mode)
            check.update({'mode': mode, 'logical_world_origin': [x, 0, 0],
                          'staging_location_is_separate': list(obj['location'])})
            result['fence_chains'].append(check)
            end_sets.append(endpoints)
        joins = []
        for x in range(3):
            left, right = end_sets[x][1.], end_sets[x+1][0.]
            assert left.keys() == right.keys()
            errors = [max(abs(left[key][a]-right[key][a]) for a in range(2)) for key in left]
            joins.append({'cells': [x, x+1], 'actual_surface_loop_pairs': len(errors),
                          'maximum_uv_error': max(errors), 'minimum_uv_error': min(errors)})
        result['fence_joins'][mode] = joins
    rows = []
    for grain, normal, origin in ((0, 2, (1, 0, 0)), (0, 1, (1, 0, 0)),
                                  (2, 0, (0, 0, 1)), (2, 1, (0, 0, 1))):
        for height in (.375, .5, .625, .75, .875, 1.):
            left, right = [.5, height, .5], [.5, height, .5]
            left[grain], right[grain] = 1., 0.
            a = expected_uv(left, normal, grain)
            b = expected_uv(right, normal, grain, origin)
            local = expected_uv(right, normal, grain, origin, 'local_reset')
            rows.append({'grain_axis': grain, 'normal_axis': normal, 'join_height': height,
                'world_offset_join_uv_error': max(abs(a[i]-b[i]) for i in range(2)),
                'local_reset_join_uv_error': max(abs(a[i]-local[i]) for i in range(2))})
    supplied = json.loads((ROOT/'reports/world-offset-uv-contract.json').read_text())
    result['independent_24_arithmetic_samples'] = {'count': len(rows), 'rows': rows,
        'matches_supplied_rows': rows == supplied['joins'],
        'scope': 'Arithmetic points, not a claim of 24 physical surface joins; actual stored source-loop pairs checked separately'}
    extra = []
    for axis, normal in ((0, 2), (2, 0)):
        for cell in (-33, -2, -1, 0, 1, 31, 32):
            for normal2 in (normal, 1):
                left, right = [.4375, .375, .4375], [.4375, .375, .4375]
                left[axis], right[axis] = 1., 0.
                a = [0, 0, 0]
                b = [0, 0, 0]
                a[axis], b[axis] = cell, cell+1
                u = expected_uv(left, normal2, axis, a)
                v = expected_uv(right, normal2, axis, b)
                extra.append(max(abs(u[i]-v[i]) for i in range(2)))
    result['negative_and_chunklike_world_origin_extra_tests'] = {'cases': len(extra), 'maximum_error': max(extra),
        'scope': 'Reference arithmetic, no chunk accessor or float-origin runtime behavior executed'}
    for name in ('oak_fence_connection16_contact.png', 'oak_fence_phase_comparison.png'):
        path = ROOT/'previews'/name
        result['images'][name] = {'size': list(Image.open(path).size), 'actually_viewed': True}
        result['artifact_sha256'][str(path.relative_to(ROOT))] = base.sha(path)
    # Stairs: independently parse actual representative GLB/FBX and v05 image.
    stairs_boxes = [((0., 0., 0.), (1., .5, 1.)), ((0., .5, .5), (1., 1., 1.))]
    base.BOXES = stairs_boxes
    path = ROOT/'exports/stone_brick_stairs_mobile_candidate.glb'
    js, data, texture_hash, payload = base.read_glb(path)
    faces = [data['INDEX'][i:i+3] for i in range(0, len(data['INDEX']), 3)]
    check = base.mesh_checks(data['POSITION'], faces, data['NORMAL'], True)
    uv_fail = 0
    for face in faces:
        axis = max(range(3), key=lambda a: abs(data['NORMAL'][face[0]][a]))
        axes = {0: (2, 1), 1: (0, 2), 2: (0, 1)}[axis]
        for index in face:
            point, actual = data['POSITION'][index], data['TEXCOORD_0'][index]
            expected = (point[axes[0]]/2, 1-point[axes[1]]/2)
            if max(abs(actual[i]-expected[i]) for i in range(2)) > 1e-6:
                uv_fail += 1
    check.update({'default_projection_uv_failures': uv_fail, 'material': js['materials'][0],
                  'attributes': list(js['meshes'][0]['primitives'][0]['attributes']),
                  'embedded_texture_sha256': texture_hash,
                  'actual_mesh_accessor_payload_bytes': payload})
    result['stairs']['glb'] = check
    old_js, old, _, old_payload = base.read_glb(ROOT/'revisions/v01/exports/stone_brick_stairs_mobile_candidate.glb')
    result['stairs']['secondary_optimization'] = {
        'geometry_normals_uv0_indices_unchanged_from_v01': {k: data[k] == old[k] for k in ('POSITION', 'NORMAL', 'TEXCOORD_0', 'INDEX')},
        'old_accessor_payload': old_payload, 'new_accessor_payload': payload,
        'removed_uv1_bytes': old_payload-payload}
    for name in ('stone_brick_stairs_master.fbx', 'stone_brick_stairs_mobile_candidate.fbx'):
        result['stairs'][name] = base.read_fbx(ROOT/'exports'/name)
        result['artifact_sha256']['exports/'+name] = base.sha(ROOT/'exports'/name)
    result['artifact_sha256'][str(path.relative_to(ROOT))] = base.sha(path)
    texture = ROOT.parent/'materials_a/candidates/v05/textures/stone_bricks/candidate_512/basecolor.png'
    source = ROOT/'source/stone_brick_stairs_master_and_candidate.blend'
    raw = BlendReader(source).raw
    result['stairs']['v05_provenance'] = {'exact_v05_texture_packed_in_blend': texture.read_bytes() in raw,
        'actual_v05_texture_sha256': base.sha(texture), 'texture_matches_glb_embedded_image': base.sha(texture) == texture_hash}
    result['artifact_sha256'][str(source.relative_to(ROOT))] = base.sha(source)
    for suffix in ('master_geometry', 'optimized_geometry', 'optimized_mobile256', 'back_low', 'clay'):
        path = ROOT/'previews'/('stone_brick_stairs_'+suffix+'.png')
        result['images'][path.name] = {'size': list(Image.open(path).size), 'actually_viewed': True}
        result['artifact_sha256'][str(path.relative_to(ROOT))] = base.sha(path)
    result['stairs']['same_view_master_candidate'] = preview_comparison(ROOT/'previews/stone_brick_stairs_master_geometry.png', ROOT/'previews/stone_brick_stairs_optimized_geometry.png')
    result['stairs']['same_view_512_256'] = preview_comparison(ROOT/'previews/stone_brick_stairs_optimized_geometry.png', ROOT/'previews/stone_brick_stairs_optimized_mobile256.png')
    result['decision'] = {'fence_single_angle_16_derived_state_visual_review': 'reviewed_no_new_visible_geometry_blocker',
        'fence_actual_baked_world_offset_uv_reference': 'verified_offline_reference_only',
        'stairs_representative_v05_geometry_material_composite': 'retain_as_offline_visual_technical_sample',
        'all_state_block_accepted': False, 'native_integrated': False, 'mobile_pass': False}
    target = Path(__file__).with_name('fence_states_stairs_independent_audit.json')
    target.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps({'report': str(target), 'state_count': len(result['fence_states']),
        'state_uv_errors': sum(x['uv_loop_mismatches'] for x in result['fence_states']),
        'chain_uv_errors': sum(x['uv_loop_mismatches'] for x in result['fence_chains']),
        'joins': result['fence_joins'], 'arithmetic': result['independent_24_arithmetic_samples']['matches_supplied_rows'],
        'stairs': result['stairs']['glb'], 'decision': result['decision']}, indent=2))


if __name__ == '__main__':
    main()
