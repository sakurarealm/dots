"""Independent read-only fence addendum; never starts Blender, Unity or Codex.

Only existing .blend/GLB/PNG/source bytes are read. Writes this audit's JSON.
Uses the already-reviewed SDNA reader, not the maker's geometry constructors.
"""
from pathlib import Path
from collections import Counter, defaultdict
import hashlib
import json
import math
import struct
import sys

from PIL import Image, ImageChops
from blend_readonly_reader import BlendReader
import oak_fence_readonly_audit as base
from fence_states_stairs_readonly_audit import manual_fence_boxes, expected_uv

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = {
    'line': [(0, 0), (1, 0), (2, 0), (3, 0)],
    'corner': [(0, 0), (1, 0), (1, 1)],
    'T': [(-1, 0), (0, 0), (0, 1), (1, 0)],
    'four_way': [(-1, 0), (0, -1), (0, 0), (0, 1), (1, 0)],
}
DIRS = ((0, 1), (-1, 0), (0, -1), (1, 0))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def unity(p):
    return (p[0], p[2], -p[1])


def translated(p, cell):
    return (p[0]+cell[0], p[1], p[2]+cell[1])


def mask_for(cell, cells):
    return sum(1 << bit for bit, (dx, dz) in enumerate(DIRS)
               if (cell[0]+dx, cell[1]+dz) in cells)


def polygon_info(ps):
    cross_sum = [0., 0., 0.]
    for p, q in zip(ps, ps[1:]+ps[:1]):
        cr = base.cross(p, q)
        for a in range(3):
            cross_sum[a] += cr[a]
    length = math.sqrt(base.dot(cross_sum, cross_sum))
    assert length > 1e-12
    normal = tuple(x/length for x in cross_sum)
    axis = max(range(3), key=lambda a: abs(normal[a]))
    assert abs(normal[axis]) > .999999
    assert all(abs(p[axis]-ps[0][axis]) < 1e-7 for p in ps)
    return {'normal': normal, 'axis': axis, 'area': length/2,
            'volume': base.dot(ps[0], cross_sum)/6}


def records(obj):
    mesh = obj['mesh']
    ps = [unity(p) for p in mesh['positions']]
    assert len(mesh['uv']) == 1
    uvs = next(iter(mesh['uv'].values()))
    result = []
    for i, face in enumerate(mesh['faces']):
        points = [ps[v] for v in face]
        offset = mesh['face_offsets'][i]
        result.append({'points': points, 'uv': uvs[offset:offset+len(face)],
                       **polygon_info(points)})
    return result


def cyclic_key(rec, include_uv=True):
    rows = [tuple(round(x, 7) for x in p)+(tuple(round(x, 7) for x in uv)
            if include_uv else ()) for p, uv in zip(rec['points'], rec['uv'])]
    return min(tuple(rows[i:]+rows[:i]) for i in range(len(rows)))


def inside_polygon(point, polygon):
    """2D ray crossing; tested points lie away from all supplied axis edges."""
    x, y = point
    inside = False
    for (x0, y0), (x1, y1) in zip(polygon, polygon[1:]+polygon[:1]):
        if (y0 > y) != (y1 > y) and x < (x1-x0)*(y-y0)/(y1-y0)+x0:
            inside = not inside
    return inside


def boundary_partition(recs, boxes):
    """Exhaustive planar rectangles induced by mesh/box cuts, not renderer tests.

    Axis-aligned source polygons and union boxes make occupancy constant inside
    each resulting rectangle. Reconcile partition area with Newell face area.
    """
    cuts = [sorted({v[a] for lo, hi in boxes for v in (lo, hi)} |
                   {p[a] for r in recs for p in r['points']}) for a in range(3)]
    counters = Counter()
    areas = defaultdict(float)
    exterior_patches = Counter()
    per_face = []
    occupied = lambda q: any(all(lo[a] <= q[a] <= hi[a] for a in range(3))
                             for lo, hi in boxes)
    for r in recs:
        axis = r['axis']
        axes = [a for a in range(3) if a != axis]
        poly = [(p[axes[0]], p[axes[1]]) for p in r['points']]
        face_area = 0.
        face_counts = Counter()
        for u0, u1 in zip(cuts[axes[0]], cuts[axes[0]][1:]):
            for v0, v1 in zip(cuts[axes[1]], cuts[axes[1]][1:]):
                if not inside_polygon(((u0+u1)/2, (v0+v1)/2), poly):
                    continue
                p = [0., 0., 0.]
                p[axis] = r['points'][0][axis]
                p[axes[0]], p[axes[1]] = (u0+u1)/2, (v0+v1)/2
                inner = tuple(p[a]-1e-5*r['normal'][a] for a in range(3))
                outer = tuple(p[a]+1e-5*r['normal'][a] for a in range(3))
                a, b = occupied(inner), occupied(outer)
                category = ('external_correct' if a and not b else 'interior_surface'
                            if a and b else 'reversed_boundary' if b else 'unsupported')
                weight = (u1-u0)*(v1-v0)
                counters[category] += 1
                face_counts[category] += 1
                areas[category] += weight
                if category == 'external_correct':
                    exterior_patches[(axis, round(r['normal'][axis]), p[axis], u0, u1, v0, v1)] += 1
                face_area += weight
        assert abs(face_area-r['area']) < 1e-9, (face_area, r['area'])
        per_face.append(dict(face_counts))
    # Independently enumerate the union's entire exterior from box occupancy.
    expected_patches = set()
    for axis in range(3):
        axes = [a for a in range(3) if a != axis]
        for plane in cuts[axis]:
            for u0, u1 in zip(cuts[axes[0]], cuts[axes[0]][1:]):
                for v0, v1 in zip(cuts[axes[1]], cuts[axes[1]][1:]):
                    p = [0., 0., 0.]
                    p[axis], p[axes[0]], p[axes[1]] = plane, (u0+u1)/2, (v0+v1)/2
                    minus, plus = list(p), list(p)
                    minus[axis] -= 1e-5
                    plus[axis] += 1e-5
                    a, b = occupied(minus), occupied(plus)
                    if a != b:
                        expected_patches.add((axis, 1 if a else -1, plane, u0, u1, v0, v1))
    patch_area = lambda key: (key[4]-key[3])*(key[6]-key[5])
    missing = expected_patches-set(exterior_patches)
    extra = set(exterior_patches)-expected_patches
    return {'partition_rectangle_count': sum(counters.values()),
            'rectangle_categories': dict(counters), 'area_categories_m2': dict(areas),
            'expected_union_exterior_area_m2': sum(patch_area(k) for k in expected_patches),
            'unique_actual_exterior_area_m2': sum(patch_area(k) for k in exterior_patches),
            'missing_union_exterior_rectangle_count': len(missing),
            'extra_exterior_rectangle_count': len(extra),
            'missing_union_exterior_area_m2': sum(patch_area(k) for k in missing),
            'coplanar_duplicate_exterior_area_m2': sum(patch_area(k)*(n-1) for k, n in exterior_patches.items()),
            'all_polygon_partition_areas_match_Newell': True,
            'scope': 'Exact planar partition of supplied axis-aligned source polygons against manual box union; not native render/collision execution'}, per_face


def topology(recs):
    edges, directions = Counter(), Counter()
    for r in recs:
        ps = r['points']
        for a, b in zip(ps, ps[1:]+ps[:1]):
            edges[tuple(sorted((a, b)))] += 1
            directions[(a, b)] += 1
    return {'coordinate_welded_non_two_incidence_edges': sum(n != 2 for n in edges.values()),
            'coordinate_welded_boundary_edges': sum(n == 1 for n in edges.values()),
            'edge_orientation_mismatches': sum(directions[(a, b)] != directions[(b, a)]
                                              for a, b in edges),
            'surface_area_m2': sum(r['area'] for r in recs),
            'signed_surface_integral_m3': sum(r['volume'] for r in recs)}


def grain_axis(ps):
    center = [sum(p[a] for p in ps)/len(ps) for a in range(3)]
    return (0 if center[0] < .375-1e-6 or center[0] > .625+1e-6 else
            2 if center[2] < .375-1e-6 or center[2] > .625+1e-6 else 1)


def shifted_record(rec, cell):
    grain = grain_axis(rec['points'])
    return {'points': [translated(p, cell) for p in rec['points']],
            'uv': [expected_uv(p, rec['axis'], grain, (cell[0], 0, cell[1]))
                   for p in rec['points']],
            'cell': cell, **{k: rec[k] for k in ('normal', 'axis', 'area')}}


def cap_neighbor(rec, cell, cells):
    axis = rec['axis']
    if axis not in (0, 2):
        return None
    for side in (0., 1.):
        if all(abs(p[axis]-side) < 1e-7 for p in rec['points']):
            delta = 1 if side else -1
            other = (cell[0]+(delta if axis == 0 else 0),
                     cell[1]+(delta if axis == 2 else 0))
            if other in cells:
                assert rec['normal'][axis] == delta
                return other
    return None


def pattern_audit(name, cells, obj, states, supplied):
    cells = set(cells)
    actual = records(obj)
    expected, removed = [], []
    before = 0
    uv_checks = uv_failures = 0
    boxes = []
    for cell in sorted(cells):
        mask = mask_for(cell, cells)
        rs = records(states[mask])
        before += sum(len(r['points'])-2 for r in rs)
        boxes.extend((translated(lo, cell), translated(hi, cell))
                     for lo, hi in manual_fence_boxes(mask))
        for r in rs:
            sr = shifted_record(r, cell)
            other = cap_neighbor(r, cell, cells)
            if other is not None:
                sr['neighbor'] = other
                removed.append(sr)
            else:
                expected.append(sr)
    actual_count = Counter(cyclic_key(r) for r in actual)
    expected_count = Counter(cyclic_key(r) for r in expected)
    assert actual_count == expected_count, name
    cap_geometry = defaultdict(list)
    for r in removed:
        cap_geometry[tuple(sorted(r['points']))].append(r)
    for faces in cap_geometry.values():
        assert len(faces) == 2
        assert all(abs(faces[0]['normal'][a]+faces[1]['normal'][a]) < 1e-7 for a in range(3))
        assert faces[0]['cell'] == faces[1]['neighbor']
        assert faces[1]['cell'] == faces[0]['neighbor']
        assert faces[0]['area'] == faces[1]['area'] == .03125
    # Match stored assembled loops back to the independently identified cell face.
    actual_by_key = {cyclic_key(r): r for r in actual}
    actual_by_cell = defaultdict(list)
    for r in expected:
        ar = actual_by_key[cyclic_key(r)]
        actual_by_cell[r['cell']].append(ar)
        checks = len(ar['points'])
        uv_checks += checks
        # The UV-inclusive one-to-one key comparison above is the actual check.
    joins = []
    for cell in sorted(cells):
        for axis, delta in ((0, (1, 0)), (2, (0, 1))):
            neighbor = (cell[0]+delta[0], cell[1]+delta[1])
            if neighbor not in cells:
                continue
            plane = cell[0]+1 if axis == 0 else cell[1]+1
            endpoints = []
            for which in (cell, neighbor):
                values = {}
                for r in actual_by_cell[which]:
                    if r['axis'] == axis:
                        continue
                    for p, uv in zip(r['points'], r['uv']):
                        if abs(p[axis]-plane) < 1e-7:
                            key = (p, r['axis'], round(r['normal'][r['axis']]))
                            if key in values:
                                assert values[key] == uv
                            values[key] = uv
                endpoints.append(values)
            assert endpoints[0].keys() == endpoints[1].keys()
            errors = [max(abs(endpoints[0][key][a]-endpoints[1][key][a]) for a in range(2))
                      for key in endpoints[0]]
            assert errors and max(errors) < 1e-7
            joins.append({'cells': [list(cell), list(neighbor)], 'axis': axis,
                          'actual_exposed_loop_pairs': len(errors), 'maximum_uv_error': max(errors)})
    check, _ = boundary_partition(actual, boxes)
    topo = topology(actual)
    triangles = sum(len(r['points'])-2 for r in actual)
    removed_tri = sum(len(r['points'])-2 for r in removed)
    for key, actual_value in (('unculled_closed_cell_triangles', before),
                              ('removed_physically_hidden_contact_cap_triangles', removed_tri),
                              ('assembled_triangles', triangles),
                              ('surface_area_m2', topo['surface_area_m2']),
                              ('volume_m3', topo['signed_surface_integral_m3'])):
        assert abs(supplied[key]-actual_value) < 1e-8, (name, key)
    assert topo['coordinate_welded_non_two_incidence_edges'] == 0
    assert topo['edge_orientation_mismatches'] == 0
    assert set(check['rectangle_categories']) == {'external_correct'}
    assert check['missing_union_exterior_rectangle_count'] == 0
    assert check['extra_exterior_rectangle_count'] == 0
    assert check['coplanar_duplicate_exterior_area_m2'] == 0
    return {'pattern': name, 'logical_cells': [list(c) for c in sorted(cells)],
            'object': obj['name'], 'source_mesh_vertices': len(obj['mesh']['positions']),
            'source_mesh_polygons': len(actual), 'triangles_from_polygon_corner_count': triangles,
            'independent_unculled_closed_cell_triangles': before,
            'removed_contact_cap_triangles': removed_tri,
            'removed_contact_cap_polygons': len(removed),
            'matched_opposite_cap_polygon_pairs': len(cap_geometry),
            'removed_cap_area_m2': sum(r['area'] for r in removed),
            'retained_geometry_uv_one_to_one_equals_shifted_state_faces_minus_paired_caps': True,
            'all_unremoved_faces_retained': True, 'uv_loop_checks': uv_checks,
            'uv_loop_mismatches': uv_failures, 'joins': joins, 'topology': topo,
            'boundary_partition': check, 'material_slots': obj['mesh']['material_slots'],
            'uv_layer_names': list(obj['mesh']['uv']),
            'staging_location_separate_from_logical_world_uv': list(obj['location']),
            'source_rotation': list(obj['rotation']), 'source_scale': list(obj['scale'])}


def cost_audit(objects):
    output = {}
    boxes = manual_fence_boxes(10)
    for name in ('COST_union', 'COST_boxes60', 'COST_partial52_render_only'):
        obj = objects[name]
        rs = records(obj)
        partition, face_categories = boundary_partition(rs, boxes)
        output[name] = {'triangles_from_polygon_corner_count': sum(len(r['points'])-2 for r in rs),
                        'source_vertices': len(obj['mesh']['positions']),
                        'polygons': len(rs), 'topology': topology(rs),
                        'boundary_partition': partition,
                        'source_staging_location': list(obj['location']),
                        'material_slots': obj['mesh']['material_slots'],
                        'uv_layer_names': list(obj['mesh']['uv'])}
        if name == 'COST_partial52_render_only':
            mouths, post_sides = [], []
            for i, r in enumerate(rs):
                if r['axis'] == 0 and r['points'][0][0] in (.375, .625):
                    if min(p[2] for p in r['points']) == .4375 and max(p[2] for p in r['points']) == .5625:
                        mouths.append(i)
                    elif min(p[2] for p in r['points']) == .375 and max(p[2] for p in r['points']) == .625:
                        post_sides.append(i)
            assert mouths == []
            assert len(post_sides) == 2
            assert partition['area_categories_m2']['interior_surface'] == .125
            output[name]['rail_mouth_caps_remaining'] = len(mouths)
            output[name]['whole_post_side_faces_retained'] = len(post_sides)
            output[name]['retained_interior_post_join_area_m2'] = .125
            output[name]['closed_union'] = False
            output[name]['collider_approved'] = False
    raw = records(objects['COST_boxes60'])
    partial = records(objects['COST_partial52_render_only'])
    raw_keys = Counter(cyclic_key(r) for r in raw)
    partial_keys = Counter(cyclic_key(r) for r in partial)
    assert Counter(cyclic_key(r) for r in raw[:6]) == Counter(cyclic_key(r) for r in partial[:6])
    outer_caps = lambda rs: [r for r in rs if r['axis'] == 0 and r['points'][0][0] in (0., 1.)]
    assert len(outer_caps(raw)) == len(outer_caps(partial)) == 4
    assert Counter(cyclic_key(r) for r in outer_caps(raw)) == Counter(cyclic_key(r) for r in outer_caps(partial))
    output['partial52_not_raw60_attribute_subset'] = {
        'exact_retained_polygon_position_uv_subset': not bool(partial_keys-raw_keys),
        'new_or_changed_polygon_position_uv_signatures': sum((partial_keys-raw_keys).values()),
        'exact_unchanged_whole_post_faces': 6,
        'exact_unchanged_exposed_rail_outer_caps': 4,
        'new_rail_mouth_caps_remaining': 0,
        'cropped_rail_side_top_bottom_polygons': 16,
        'source_positions_new_from_trim': [list(p) for p in sorted({p for r in partial for p in r['points']}
                                                      - {p for r in raw for p in r['points']})],
        'scope': 'Rail lengths/endpoints changed as well as mouth deletion; cannot claim exact raw vertex-attribute interpolation preservation'}
    return output


def serialized_cost_comparison():
    rows = []
    for name, triangles in (('oak_fence_mobile_candidate.glb', 84),
                            ('oak_fence_box_combo_comparison.glb', 60),
                            ('oak_fence_partial52_render_reference.glb', 52)):
        path = ROOT/'exports'/name
        js, data, texture_hash, payload = base.read_glb(path)
        assert len(data['INDEX']) == triangles*3
        assert texture_hash == sha(ROOT.parent/'materials_a/textures/oak_planks/candidate_512/basecolor.png')
        rows.append({'file': str(path.relative_to(ROOT)), 'sha256': sha(path),
                     'file_bytes': path.stat().st_size, 'triangles': triangles,
                     'serialized_attribute_vertices': len(data['POSITION']),
                     'serialized_mesh_accessor_payload_bytes': payload,
                     'index_count': len(data['INDEX']), 'nodes': js['nodes']})
    return {'rows': rows, 'partial52_vs_raw60_triangle_reduction_percent': (60-52)/60*100,
            'partial52_vs_raw60_mesh_payload_reduction_bytes': rows[1]['serialized_mesh_accessor_payload_bytes']-rows[2]['serialized_mesh_accessor_payload_bytes'],
            'partial52_vs_raw60_mesh_payload_reduction_percent': (4200-3640)/4200*100,
            'union84_vs_raw60_triangle_increase_percent': (84-60)/60*100,
            'scope': 'Actual serialized accessor and whole file bytes only; no GPU alignment, chunk buffer, draw-call, energy or phone-performance claim'}


def material_graph(reader):
    material = next(b['data'] for b in reader.blocks if b['code'] == b'MA\0\0'
                    and reader.id_name(b['data'], 'Material') == 'MAT_Block_oak_planks')
    tree = reader.block_data(reader.value(material, 'Material', 'nodetree'))
    address = reader.value(reader.field(tree, 'bNodeTree', 'nodes'), 'ListBase', 'first')
    nodes = {}
    while address:
        raw = reader.block_data(address)
        nodes[address] = {'name': reader.field(raw, 'bNode', 'name').split(b'\0')[0].decode(),
                          'type': reader.field(raw, 'bNode', 'idname').split(b'\0')[0].decode()}
        address = reader.value(raw, 'bNode', 'next')
    links = []
    address = reader.value(reader.field(tree, 'bNodeTree', 'links'), 'ListBase', 'first')
    while address:
        raw = reader.block_data(address)
        links.append({'from': nodes[reader.value(raw, 'bNodeLink', 'fromnode')],
                      'to': nodes[reader.value(raw, 'bNodeLink', 'tonode')]})
        address = reader.value(raw, 'bNodeLink', 'next')
    output_links = [l for l in links if l['to']['type'] == 'ShaderNodeOutputMaterial']
    assert len(output_links) == 1 and output_links[0]['from']['type'] == 'ShaderNodeBsdfToon'
    return {'nodes': list(nodes.values()), 'links': links,
            'actual_saved_source_output_linked_from_toon_not_principled': True,
            'scope': 'Actual saved source SDNA node/link bytes; no shader execution'}


def partial_glb_audit(path, source):
    js, data, texture_hash, payload = base.read_glb(path)
    base.BOXES = manual_fence_boxes(10)
    faces = [data['INDEX'][i:i+3] for i in range(0, len(data['INDEX']), 3)]
    checks = base.mesh_checks(data['POSITION'], faces, data['NORMAL'], True, data['TEXCOORD_0'])
    # Confirm serialized triangles cover the same oriented source polygon planes/UV.
    source_recs = records(source)
    source_vertices = {(p, (uv[0], 1-uv[1]), tuple(r['normal']))
                       for r in source_recs for p, uv in zip(r['points'], r['uv'])}
    serialized_vertices = {(p, uv, n) for p, uv, n in zip(data['POSITION'], data['TEXCOORD_0'], data['NORMAL'])}
    assert serialized_vertices == source_vertices
    assert abs(checks['surface_area_m2']-sum(r['area'] for r in source_recs)) < 1e-8
    assert checks['triangles'] == 52 and payload == 3640
    assert checks['directional_uv_vertex_checks_failed'] == 0
    triangle_assignment = defaultdict(list)
    for face in faces:
        ps = [data['POSITION'][i] for i in face]
        candidates = [i for i, r in enumerate(source_recs)
                      if all(p in r['points'] for p in ps)
                      and all(base.dot(data['NORMAL'][k], r['normal']) > .999999 for k in face)]
        assert len(candidates) == 1
        triangle_assignment[candidates[0]].append(ps)
    for i, r in enumerate(source_recs):
        triangles = triangle_assignment[i]
        assert len(r['points']) == 4 and len(triangles) == 2
        assert set(triangles[0]) | set(triangles[1]) == set(r['points'])
        diagonal = set(triangles[0]) & set(triangles[1])
        assert len(diagonal) == 2
        indices = sorted(r['points'].index(p) for p in diagonal)
        assert indices[1]-indices[0] == 2
        assert abs(sum(polygon_info(ps)['area'] for ps in triangles)-r['area']) < 1e-9
    sample_categories = Counter()
    failure_triangles = []
    for triangle_index, face in enumerate(faces):
        ps = [data['POSITION'][i] for i in face]
        info = polygon_info(ps)
        failures = Counter()
        for i in range(1, 12):
            for j in range(1, 12-i):
                weights = (i/12, j/12, (12-i-j)/12)
                p = tuple(sum(weights[k]*ps[k][a] for k in range(3)) for a in range(3))
                inner = tuple(p[a]-1e-5*info['normal'][a] for a in range(3))
                outer = tuple(p[a]+1e-5*info['normal'][a] for a in range(3))
                a, b = base.occupied(inner), base.occupied(outer)
                category = ('external_correct' if a and not b else 'interior_surface'
                            if a and b else 'reversed_boundary' if b else 'unsupported')
                sample_categories[category] += 1
                if category != 'external_correct':
                    failures[category] += 1
        if failures:
            assert info['axis'] == 0 and ps[0][0] in (.375, .625)
            failure_triangles.append({'triangle': triangle_index, 'normal_axis': info['axis'],
                                      'post_side_plane': ps[0][0], 'sample_failure_categories': dict(failures)})
    assert sample_categories['interior_surface'] == checks['boundary_sample_failures'] == 76
    assert not sample_categories['unsupported'] and not sample_categories['reversed_boundary']
    checks['boundary_sample_categories'] = dict(sample_categories)
    checks['failure_triangles'] = failure_triangles
    checks['all_76_failed_boundary_samples_are_retained_post_interior_not_missing_exterior'] = True
    primitive = js['meshes'][0]['primitives'][0]
    attributes = {}
    for name, index in primitive['attributes'].items():
        a = js['accessors'][index]
        attributes[name] = {'count': a['count'], 'componentType': a['componentType'],
                            'type': a['type'], 'payload_bytes': a['count']*{'VEC2': 2, 'VEC3': 3}[a['type']]*4}
    ia = js['accessors'][primitive['indices']]
    material = js['materials'][primitive.get('material', 0)]
    return {'file_bytes': path.stat().st_size, 'sha256': sha(path),
            'actual_mesh_accessor_payload_bytes': payload, 'attributes': attributes,
            'index_count': ia['count'], 'index_componentType': ia['componentType'],
            'index_payload_bytes': ia['count']*2, 'nodes': js['nodes'],
            'source_node_staging_translation_present': js['nodes'][0].get('translation') != [0, 0, 0],
            'serialized_position_uv_normal_values_equal_source_face_corners': True,
            'all_26_source_rectangles_covered_by_exactly_two_exported_triangles': True,
            'exported_triangles_missing_overlapping_or_outside_source_polygons': 0,
            'checks': checks, 'material': material,
            'opaque': material.get('alphaMode', 'OPAQUE') == 'OPAQUE',
            'double_sided': material.get('doubleSided', False),
            'embedded_texture_sha256': texture_hash,
            'shared_oak_png_matches_embedded': texture_hash == sha(ROOT.parent/'materials_a/textures/oak_planks/candidate_512/basecolor.png'),
            'local_grid_bounds_do_not_remove_exported_node_staging': True,
            'source_diffuse_toon_and_export_PBR_not_same_shader': True}


def crop_is_raw(annotated, raw):
    a, b = Image.open(annotated).convert('RGB'), Image.open(raw).convert('RGB')
    assert a.width == b.width
    # Headers start the image at y=90; captions can overlay raw edges.
    crop = a.crop((0, 90, b.width, 90+b.height))
    diff = ImageChops.difference(crop, b)
    return {'raw_size': list(b.size), 'annotated_size': list(a.size),
            'annotated_body_difference_bbox': list(diff.getbbox()) if diff.getbbox() else None,
            'scope': 'Caption overlay may differ; both original files separately viewed'}


def main():
    handoff = json.loads((ROOT/'reports/fence_extra_review_handoff.json').read_text())
    fingerprints = []
    for f in handoff['files']:
        p = ROOT/f['path']
        checked = {'path': f['path'], 'size_bytes': p.stat().st_size, 'sha256': sha(p),
                   'handoff_exact_match': p.stat().st_size == f['size_bytes'] and sha(p) == f['sha256']}
        assert checked['handoff_exact_match'], f['path']
        fingerprints.append(checked)
    reader = BlendReader(ROOT/'source/oak_fence_patterns_cost_reference.blend')
    objects = {o['name']: o for o in reader.mesh_objects()}
    phase_reader = BlendReader(ROOT/'source/oak_fence_connection_phase_reference.blend')
    states = {int(o['name'][6:], 2): o for o in phase_reader.mesh_objects() if o['name'].startswith('STATE_')}
    report = json.loads((ROOT/'reports/fence-patterns-cost-study.json').read_text())
    supplied = {r['pattern']: r for r in report['patterns']}
    result = {'scope': 'Only new existing multicell, contact-cap, partial52 cost and complementary-back evidence',
              'read_only_source': True, 'blender_executed': False, 'render_executed': False,
              'native_executed': False, 'Unity_executed': False, 'phone_executed': False,
              'Codex_invoked': False, 'assets_modified': False,
              'prior_review_read_before_work': 'oak_fence_v02_independent_review.md',
              'handoff_fingerprints': fingerprints,
              'source_header': reader.raw[:12].decode(), 'source_decompressed_bytes': len(reader.raw),
              'source_reference_shared_oak_png_exact_packed': (ROOT.parent/'materials_a/textures/oak_planks/candidate_512/basecolor.png').read_bytes() in reader.raw,
              'actual_saved_source_material_graph': material_graph(reader),
              'comparison_state_reference_sha256': sha(ROOT/'source/oak_fence_connection_phase_reference.blend'),
              'patterns': [pattern_audit(name, cells, objects['PATTERN_'+name], states, supplied[name])
                           for name, cells in PATTERNS.items()],
              'cost_source_meshes': cost_audit(objects),
              'actual_serialized_cost_comparison': serialized_cost_comparison(),
              'partial52_glb': partial_glb_audit(ROOT/'exports/oak_fence_partial52_render_reference.glb', objects['COST_partial52_render_only']),
              'fourway92_scope': 'Arithmetic 12 post + 8 rails*10 triangles = 92; no actual partial92 mesh, GLB or all16 adapter verified',
              'images': {}}
    for name in ('oak_fence_multicell_world_phase_raw.png', 'oak_fence_multicell_world_phase.png',
                 'oak_fence_representation_cost_raw.png', 'oak_fence_representation_cost.png',
                 'oak_fence_connection16_back_contact.png'):
        p = ROOT/'previews'/name
        result['images'][name] = {'size': list(Image.open(p).size), 'sha256': sha(p), 'actually_viewed': True}
    result['annotated_multicell_to_raw'] = crop_is_raw(ROOT/'previews/oak_fence_multicell_world_phase.png', ROOT/'previews/oak_fence_multicell_world_phase_raw.png')
    result['annotated_cost_to_raw'] = crop_is_raw(ROOT/'previews/oak_fence_representation_cost.png', ROOT/'previews/oak_fence_representation_cost_raw.png')
    back_script = (ROOT/'scripts/render_fence_state_back.py').read_text()
    result['complementary_back_view_provenance'] = {
        'back_script_sha256': sha(ROOT/'scripts/render_fence_state_back.py'),
        'loads_existing_state_reference': "oak_fence_connection_phase_reference.blend" in back_script,
        'front_camera_blender_xyz': [3.7, 4.3, 3.5], 'back_camera_blender_xyz': [-2.7, -4.3, 3.5],
        'both_cameras_above_object_not_underside': True,
        'actual_state_mask_triangles': {format(mask, '04b'): sum(len(f)-2 for f in states[mask]['mesh']['faces']) for mask in range(16)},
        'all16_second_oblique_view_actually_viewed': True,
        'scope': 'Existing PNG plus source/script provenance, no independent rerender or native neighbor resolution'}
    result['decision'] = {
        'multicell_paired_contact_cap_only_removal': 'verified_four_existing_offline_patterns',
        'multicell_actual_stored_world_phase_loops': 'verified_X_and_Z_joins_in_four_existing_patterns',
        'partial52_actual_GLB_bytes_source_geometry': 'verified_mask10_render_reference_only',
        'complementary_back16_visual': 'reviewed_second_above_oblique_view_no_new_visible_geometry_blocker',
        'overlap60_black_top_patch': 'visually_present_in_existing_Blend_diffuse_toon_reference',
        'partial52_clean_exterior': False, 'partial52_closed_collider': False,
        'all16_partial_adapter_verified': False, 'native_scalar_uv_interface_changed': False,
        'full_state_block_accepted': False, 'native_integrated': False,
        'mobile_pass': False, 'production_art_accepted': False,
        'selected_mobile_representation': None}
    out = Path(__file__).with_name('fence-extra-independent-audit.json')
    out.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps({'report': str(out), 'patterns': [{'name': r['pattern'], 'triangles': r['triangles_from_polygon_corner_count'],
                    'cap_triangles_removed': r['removed_contact_cap_triangles'], 'join_pairs': sum(j['actual_exposed_loop_pairs'] for j in r['joins']),
                    'boundary_partition': r['boundary_partition']} for r in result['patterns']],
                    'cost': result['cost_source_meshes'], 'partial_glb': result['partial52_glb'], 'decision': result['decision']}, indent=2))


if __name__ == '__main__':
    main()
