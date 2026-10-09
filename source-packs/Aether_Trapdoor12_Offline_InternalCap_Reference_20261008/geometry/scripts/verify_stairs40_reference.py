"""Maker's read-only artifact-byte checks, ready for independent review reuse."""
from pathlib import Path
import collections, hashlib, json, math, struct, sys, zlib

GEOM = Path(__file__).resolve().parents[1]
OUT = GEOM / 'stairs40_reference'
sys.path.insert(0, str(GEOM / 'reviews'))
from oak_fence_readonly_audit import mesh_checks, cross, sub, dot


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def record_hash(records):
    values = sorted(set(tuple(0. if abs(float(v)) < 5e-7 else round(float(v), 6) for v in r) for r in records))
    return hashlib.sha256(json.dumps(values, separators=(',', ':')).encode()).hexdigest(), len(values)


def expected_occupied(p, f, upper, corner):
    x, y, z = p
    if not all(0 <= v <= 1 for v in p):
        return False
    if (y >= .5 if upper else y <= .5):
        return True
    high = [z >= .5, x <= .5, z <= .5, x >= .5]
    forward = high[f]
    side = high[(f - 1 if corner.endswith('left') else f + 1) % 4]
    return forward if corner == 'straight' else forward or side if corner.startswith('inner') else forward and side


def check_arrays(points, tris, normals, uv, row):
    check = mesh_checks(points, tris, normals)
    expected_volume = .75 if row['resolved_corner'] == 'straight' else .875 if row['resolved_corner'].startswith('inner') else .625
    assert check['bounds'] == [[0., 0., 0.], [1., 1., 1.]]
    assert abs(check['signed_volume_m3'] - expected_volume) < 1e-6
    assert check['triangles'] == (20 if row['resolved_corner'] == 'straight' else 24)
    assert not any(check[k] for k in ('degenerate_triangles', 'coordinate_welded_non_two_incidence_edges',
        'edge_orientation_mismatches', 'normal_mismatch_triangles', 'non_axis_aligned_triangles'))
    uv_bad = sample_bad = samples = 0
    records = []
    for face in tris:
        a, b, c = [points[i] for i in face]
        n = cross(sub(b, a), sub(c, a)); size = math.sqrt(dot(n, n)); n = tuple(v / size for v in n)
        axis = max(range(3), key=lambda k: abs(n[k])); axes = {0: (2, 1), 1: (0, 2), 2: (0, 1)}[axis]
        for i in face:
            expected = tuple(points[i][a] * .5 for a in axes)
            if max(abs(uv[i][j] - expected[j]) for j in range(2)) > 1e-6:
                uv_bad += 1
            records.append((*points[i], *normals[i], *uv[i]))
        for wa, wb, wc in ((.2, .3, .5), (.17, .41, .42), (.31, .21, .48), (.43, .38, .19)):
            p = tuple(wa * a[k] + wb * b[k] + wc * c[k] for k in range(3))
            inside = tuple(p[k] - n[k] * 1e-5 for k in range(3))
            outside = tuple(p[k] + n[k] * 1e-5 for k in range(3))
            samples += 1
            if not expected_occupied(inside, row['facing'], row['upper_half'], row['resolved_corner']) or expected_occupied(outside, row['facing'], row['upper_half'], row['resolved_corner']):
                sample_bad += 1
    h, count = record_hash(records)
    check.update({'projection_uv_failed_loop_checks': uv_bad, 'functional_surface_probe_count': samples,
        'functional_surface_probe_failures': sample_bad, 'canonical_surface_corner_sha256': h,
        'canonical_unique_surface_corners': count})
    assert uv_bad == sample_bad == 0, (row['state_key'], uv_bad, sample_bad)
    return check


def read_glb(path=None, expected_mesh_count=40):
    path = path or OUT / 'exports' / 'stone_brick_stairs40_reference_atlas.glb'
    raw = path.read_bytes(); assert struct.unpack_from('<III', raw) == (0x46546c67, 2, len(raw))
    cursor = 12; js = binary = None
    while cursor < len(raw):
        size, kind = struct.unpack_from('<II', raw, cursor); data = raw[cursor+8:cursor+8+size]; cursor += 8+size
        if kind == 0x4e4f534a: js = json.loads(data)
        elif kind == 0x004e4942: binary = data
    def access(i):
        a = js['accessors'][i]; v = js['bufferViews'][a['bufferView']]
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        code = {5126: 'f', 5123: 'H', 5125: 'I'}[a['componentType']]; fmt = '<' + code*n
        start = v.get('byteOffset', 0) + a.get('byteOffset', 0); step = v.get('byteStride', struct.calcsize(fmt))
        return [struct.unpack_from(fmt, binary, start+j*step) for j in range(a['count'])]
    assert len(js['meshes']) == expected_mesh_count and len(js['materials']) == 1 and len(js['images']) == 1
    material = js['materials'][0]
    assert not material.get('doubleSided', False) and material.get('alphaMode', 'OPAQUE') == 'OPAQUE'
    assert material['pbrMetallicRoughness']['baseColorTexture'].get('texCoord', 0) == 0
    view = js['bufferViews'][js['images'][0]['bufferView']]
    texture_sha = hashlib.sha256(binary[view.get('byteOffset', 0):view.get('byteOffset', 0)+view['byteLength']]).hexdigest()
    result = []
    for node in js['nodes']:
        if 'mesh' not in node: continue
        mesh = js['meshes'][node['mesh']]; assert len(mesh['primitives']) == 1
        p = mesh['primitives'][0]; assert p.get('mode', 4) == 4
        assert set(p['attributes']) == {'POSITION', 'NORMAL', 'TEXCOORD_0'}
        points = access(p['attributes']['POSITION']); normals = access(p['attributes']['NORMAL'])
        uv = [(u, 1-v) for u, v in access(p['attributes']['TEXCOORD_0'])]
        indices = [x[0] for x in access(p['indices'])]; faces = [indices[i:i+3] for i in range(0, len(indices), 3)]
        accessor_ids = [*p['attributes'].values(), p['indices']]
        payload = sum(js['accessors'][i]['count'] * {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[js['accessors'][i]['type']] * {5126: 4, 5123: 2, 5125: 4}[js['accessors'][i]['componentType']] for i in accessor_ids)
        result.append({'name': node['name'], 'points': points, 'faces': faces, 'normals': normals, 'uv': uv,
            'node_extras': node.get('extras', {}), 'node_page_translation': node.get('translation'), 'payload': payload})
    return result, texture_sha, material


def main():
    from blend_readonly_reader import BlendReader
    supplied = json.loads((OUT / 'reports' / 'stairs40-actual-mesh-snapshots.json').read_text())['actual_Blender_generated_meshes']
    assert len(supplied) == 40 and len({r['state_key'] for r in supplied}) == 40
    rows = {r['state_key']: r for r in supplied}
    actual_source = [ob for ob in BlendReader(OUT / 'source' / 'stone_brick_stairs40_reference.blend').mesh_objects() if ob['name'].startswith('STAIRS_')]
    assert len(actual_source) == 40
    source_results = {}; source_hashes = {}
    for ob in actual_source:
        key = ob['name'][7:]; row = rows[key]; me = ob['mesh']
        points = [(p[0], p[2], -p[1]) for p in me['positions']]
        assert [list(p) for p in points] == row['vertices_unity'] and me['faces'] == row['faces']
        uvs = next(iter(me['uv'].values())); assert len(me['uv']) == me['material_slots'] == 1
        records = []; stored_uv_bad = normal_bad = 0
        for fi, face in enumerate(me['faces']):
            n = row['face_normals_unity'][fi]
            axis = max(range(3), key=lambda a: abs(n[a])); axes = {0: (2, 1), 1: (0, 2), 2: (0, 1)}[axis]
            for j, idx in enumerate(face):
                uv = uvs[me['face_offsets'][fi] + j]
                assert list(uv) == row['face_loop_uv'][fi][j]
                if max(abs(uv[k] - points[idx][axes[k]]*.5) for k in range(2)) > 1e-6: stored_uv_bad += 1
                records.append((*points[idx], *n, *uv))
        h, count = record_hash(records); source_hashes[key] = h
        tri_points = []; tri_normals = []; tri_uv = []; tri_indices = []
        for triangle in row['triangles']:
            ps = [points[i] for i in triangle]; n = cross(sub(ps[1], ps[0]), sub(ps[2], ps[0])); size = math.sqrt(dot(n, n)); n = tuple(v/size for v in n)
            axis = max(range(3), key=lambda a: abs(n[a])); axes = {0: (2, 1), 1: (0, 2), 2: (0, 1)}[axis]
            ids = []
            for p in ps:
                ids.append(len(tri_points)); tri_points.append(p); tri_normals.append(n); tri_uv.append(tuple(p[a]*.5 for a in axes))
            tri_indices.append(ids)
        check = check_arrays(tri_points, tri_indices, tri_normals, tri_uv, row)
        check['actual_stored_source_loop_uv_failures'] = stored_uv_bad
        assert check['canonical_surface_corner_sha256'] == h
        source_results[key] = check
    glb_meshes, texture_sha, material = read_glb(); glb_results = {}; total_payload = 0
    for ob in glb_meshes:
        key = ob['name'][7:]; row = rows[key]
        check = check_arrays(ob['points'], ob['faces'], ob['normals'], ob['uv'], row)
        assert check['canonical_surface_corner_sha256'] == source_hashes[key]
        assert ob['node_extras']['state_key'] == key and ob['node_extras']['mobile_pass'] is False
        check.update({'source_corner_hash_matches': True, 'attributes': ['POSITION', 'NORMAL', 'TEXCOORD_0'],
            'actual_mesh_accessor_payload_bytes': ob['payload'], 'node_translation_page_layout_only': ob['node_page_translation']})
        total_payload += ob['payload']; glb_results[key] = check
    expected_texture = sha(GEOM.parent / 'materials_a' / 'candidates' / 'v05' / 'textures' / 'stone_bricks' / 'candidate_512' / 'basecolor.png')
    assert texture_sha == expected_texture
    result = {'author_self_check_not_independent_review': True, 'source_state': 'historical 0956b077',
        'source_mesh_count': len(source_results), 'actual_GLB_mesh_count': len(glb_results),
        'actual_GLB_material_count': 1, 'actual_GLB_texture_count': 1,
        'actual_GLB_mesh_accessor_payload_bytes_all40': total_payload,
        'all_state_surface_corner_hashes_match_saved_source': True,
        'actual_GLB_embedded_texture_sha256': texture_sha, 'actual_GLB_material': material,
        'source_cases': source_results, 'GLB_cases': glb_results,
        'checks_scope': 'Read-only actual source BLEND and GLB bytes. Functional surface probes use independently enumerated directional half/quarter occupancy. FBX import remains separate and no native engine/device execution.',
        'artifact_sha256': {str(p.relative_to(OUT)): sha(p) for p in [OUT/'source'/'stone_brick_stairs40_reference.blend', *sorted((OUT/'exports').glob('*'))]},
        'full_block_accepted': False, 'native_integrated': False, 'mobile_pass': False}
    (OUT / 'reports' / 'stairs40-byte-selfcheck.json').write_text(json.dumps(result, indent=2))
    print(json.dumps({'status': '40 source + 40 GLB actual mesh byte checks pass', 'payload_bytes': total_payload,
                      'functional_probes': sum(r['functional_surface_probe_count'] for r in glb_results.values()), 'mobile_pass': False}))


if __name__ == '__main__':
    main()
