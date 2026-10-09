"""Independent offline byte/geometry audit. Does not execute Blender or game code.

Uses the pre-existing read-only Blender SDNA container reader only; expected
shape and all tests below are independently defined from historical C#.
"""
import collections
import hashlib
import io
import itertools
import json
import math
from pathlib import Path
import re
import struct
import zlib
import numpy as np
from PIL import Image

from blend_readonly_reader import BlendReader

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / 'geometry/next_trapdoor12'
OUT = ROOT / 'geometry/reviews/trapdoor12_independent_readonly_audit.json'


def sha(b):
    return hashlib.sha256(b).hexdigest()


def unity(p):
    return (p[0], p[2], -p[1])


def sub(a, b):
    return tuple(x-y for x, y in zip(a, b))


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def normal(pts):
    v = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]))
    n = math.sqrt(sum(x*x for x in v))
    assert n > 0
    return tuple(x/n for x in v)


def bounds(pts):
    return [tuple(min(p[a] for p in pts) for a in range(3)),
            tuple(max(p[a] for p in pts) for a in range(3))]


def expected_boxes(meta):
    # ChunkMeshGenerator.cs:964-1042. Closed ignores facing; open ignores upper.
    if meta & 8:
        t = 2 if meta % 4 in (0, 2) else 0
        axes = (0, 1) if t == 2 else (2, 1)
        lo = 0.8125 if meta % 4 in (0, 3) else 0.0
    else:
        t, axes = 1, (0, 2)
        lo = 0.8125 if meta & 4 else 0.0
    planar = [(0, 0, 1, .125), (0, .875, 1, 1),
              (0, .125, .125, .875), (.875, .125, 1, .875),
              (.125, .4375, .875, .5625), (.4375, .125, .5625, .875)]
    result = []
    for u0, v0, u1, v1 in planar:
        a, b = [0.0]*3, [0.0]*3
        a[t], b[t] = lo, lo + .1875
        a[axes[0]], b[axes[0]] = u0, u1
        a[axes[1]], b[axes[1]] = v0, v1
        result.append((tuple(a), tuple(b)))
    return result, t, axes


def box_faces(box):
    lo, hi = box
    for axis in range(3):
        others = [x for x in range(3) if x != axis]
        for sign in (-1, 1):
            pts = []
            for a, b in [(0, 0), (0, 1), (1, 1), (1, 0)]:
                p = list(lo)
                p[axis] = lo[axis] if sign < 0 else hi[axis]
                p[others[0]] = (lo, hi)[a][others[0]]
                p[others[1]] = (lo, hi)[b][others[1]]
                pts.append(tuple(p))
            if normal(pts)[axis] != sign:
                pts.reverse()
            n = tuple(sign if a == axis else 0 for a in range(3))
            yield pts, n


def face_key(pts, n):
    return (tuple(n), tuple(sorted(tuple(p) for p in pts)))


def occupied(p, boxes):
    return any(all(lo[i] < p[i] < hi[i] for i in range(3)) for lo, hi in boxes)


def backed(pts, n, boxes):
    axis = next(i for i, x in enumerate(n) if x)
    lo, hi = bounds(pts)
    axes = [i for i in range(3) if i != axis]
    cuts = []
    for a in axes:
        cuts.append(sorted({lo[a], hi[a]} | {v[a] for b in boxes for v in b if lo[a] < v[a] < hi[a]}))
    for i in range(len(cuts[0])-1):
        for j in range(len(cuts[1])-1):
            p = list(lo)
            p[axis] += n[axis] * 1e-7
            p[axes[0]] = (cuts[0][i] + cuts[0][i+1]) / 2
            p[axes[1]] = (cuts[1][j] + cuts[1][j+1]) / 2
            if not occupied(p, boxes):
                return False
    return True


def point_on_triangle(p, pts):
    n = normal(pts)
    axis = max(range(3), key=lambda a: abs(n[a]))
    if abs(p[axis]-pts[0][axis]) > 1e-8:
        return False
    a, b = [i for i in range(3) if i != axis]
    def area(u, v, w):
        return (v[a]-u[a])*(w[b]-u[b]) - (v[b]-u[b])*(w[a]-u[a])
    full = area(*pts)
    bary = [area(p, pts[1], pts[2])/full,
            area(pts[0], p, pts[2])/full,
            area(pts[0], pts[1], p)/full]
    return min(bary) >= -1e-9 and max(bary) <= 1+1e-9


def union_samples(boxes):
    cuts = [sorted({v[a] for b in boxes for v in b}) for a in range(3)]
    cells = {}
    vol = 0.0
    for ijk in itertools.product(*(range(len(c)-1) for c in cuts)):
        lo = tuple(cuts[a][ijk[a]] for a in range(3))
        hi = tuple(cuts[a][ijk[a]+1] for a in range(3))
        p = tuple((lo[a]+hi[a])/2 for a in range(3))
        cells[ijk] = occupied(p, boxes)
        if cells[ijk]:
            vol += math.prod(hi[a]-lo[a] for a in range(3))
    samples = []
    for ijk, filled in cells.items():
        if not filled:
            continue
        for axis in range(3):
            for sign in (-1, 1):
                neighbor = list(ijk)
                neighbor[axis] += sign
                if cells.get(tuple(neighbor), False):
                    continue
                lo = [cuts[a][ijk[a]] for a in range(3)]
                hi = [cuts[a][ijk[a]+1] for a in range(3)]
                p = [lo[a]+(hi[a]-lo[a])*(.37 if a % 2 else .61) for a in range(3)]
                p[axis] = lo[axis] if sign < 0 else hi[axis]
                n = tuple(sign if a == axis else 0 for a in range(3))
                samples.append((tuple(p), n))
    return samples, vol


def glb(path):
    b = path.read_bytes()
    magic, version, length = struct.unpack_from('<4sII', b)
    assert magic == b'glTF' and version == 2 and length == len(b)
    cursor, chunks = 12, {}
    while cursor < len(b):
        length, code = struct.unpack_from('<II', b, cursor)
        cursor += 8
        chunks[code] = b[cursor:cursor+length]
        cursor += length
    j = json.loads(chunks[0x4e4f534a])
    blob = chunks[0x004e4942]
    def accessor(idx):
        a = j['accessors'][idx]
        assert 'sparse' not in a and not a.get('normalized', False)
        v = j['bufferViews'][a['bufferView']]
        code = {5126: 'f', 5123: 'H', 5125: 'I'}[a['componentType']]
        count = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        size = struct.calcsize(code)*count
        stride = v.get('byteStride', size)
        off = v.get('byteOffset', 0)+a.get('byteOffset', 0)
        return [struct.unpack_from('<'+code*count, blob, off+i*stride) for i in range(a['count'])]
    cases, ranges, ref_sum = {}, set(), 0
    for m in j['meshes']:
        assert len(m['primitives']) == 1
        p = m['primitives'][0]
        assert p.get('mode', 4) == 4 and p['material'] == 0
        assert set(p['attributes']) == {'POSITION', 'NORMAL', 'TEXCOORD_0'}
        positions = accessor(p['attributes']['POSITION'])
        normals = accessor(p['attributes']['NORMAL'])
        uv = accessor(p['attributes']['TEXCOORD_0'])
        idx = [x[0] for x in accessor(p['indices'])]
        assert len(idx) % 3 == 0
        corners = [(positions[i], normals[i], uv[i]) for i in range(len(positions))]
        tris = [tuple(corners[x] for x in idx[i:i+3]) for i in range(0, len(idx), 3)]
        cases[int(re.search(r'meta(\d+)', m['name']).group(1))] = {'name': m['name'], 'corners': corners, 'triangles': tris, 'positions': positions}
        for ai in list(p['attributes'].values())+[p['indices']]:
            a = j['accessors'][ai]
            v = j['bufferViews'][a['bufferView']]
            size = struct.calcsize({5126: 'f', 5123: 'H', 5125: 'I'}[a['componentType']])*{'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
            start = v.get('byteOffset', 0)+a.get('byteOffset', 0)
            end = start + (a['count']-1)*v.get('byteStride', size)+size
            ranges.add((start, end))
            ref_sum += end-start
    merged = []
    for a, z in sorted(ranges):
        if merged and a <= merged[-1][1]:
            merged[-1][1] = max(z, merged[-1][1])
        else:
            merged.append([a, z])
    images = []
    for img in j['images']:
        v = j['bufferViews'][img['bufferView']]
        off = v.get('byteOffset', 0)
        data = blob[off:off+v['byteLength']]
        images.append({'sha256': sha(data), 'bytes': len(data)})
    return {'json': j, 'cases': cases, 'bytes': len(b), 'sha256': sha(b),
            'unique_mesh_range_bytes': sum(z-a for a, z in merged),
            'accessor_reference_range_sum': ref_sum, 'embedded_images': images}


def fbx(path):
    b = path.read_bytes()
    assert b.startswith(b'Kaydara FBX Binary  \x00\x1a\x00')
    version = struct.unpack_from('<I', b, 23)[0]
    assert version == 7400
    def prop(p):
        t = chr(b[p]); p += 1
        if t in 'YCLFDI':
            fmt = {'Y': 'h', 'C': 'B', 'L': 'q', 'F': 'f', 'D': 'd', 'I': 'i'}[t]
            return struct.unpack_from('<'+fmt, b, p)[0], p+struct.calcsize(fmt)
        if t in 'SR':
            n = struct.unpack_from('<I', b, p)[0]; p += 4
            value = b[p:p+n]
            return value.decode(errors='replace') if t == 'S' else value, p+n
        if t in 'fdlibc':
            n, encoded, size = struct.unpack_from('<III', b, p); p += 12
            data = b[p:p+size]
            if encoded: data = zlib.decompress(data)
            fmt = {'f': 'f', 'd': 'd', 'l': 'q', 'i': 'i', 'b': 'B', 'c': 'B'}[t]
            return struct.unpack('<'+fmt*n, data), p+size
        raise AssertionError(t)
    def node(p):
        end, count, prop_len, name_len = struct.unpack_from('<IIIB', b, p); p += 13
        if not end: return None, p
        name = b[p:p+name_len].decode(); p += name_len
        pp, cc = [], []
        for _ in range(count):
            value, p = prop(p); pp.append(value)
        while p < end-13:
            child, p = node(p)
            if child: cc.append(child)
        return {'name': name, 'p': pp, 'c': cc}, end
    p, nodes = 27, []
    while p < len(b):
        n, p = node(p)
        if not n: break
        nodes.append(n)
    objects = next(n for n in nodes if n['name'] == 'Objects')['c']
    cases = {}
    for g in (n for n in objects if n['name'] == 'Geometry'):
        children = {c['name']: c for c in g['c']}
        positions = list(zip(*(iter(children['Vertices']['p'][0]),)*3))
        faces, current = [], []
        for i in children['PolygonVertexIndex']['p'][0]:
            current.append(i if i >= 0 else -i-1)
            if i < 0:
                faces.append(current); current = []
        nn = {c['name']: c['p'] for c in children['LayerElementNormal']['c']}
        uu = {c['name']: c['p'] for c in children['LayerElementUV']['c']}
        assert nn['MappingInformationType'] == ['ByPolygonVertex'] and nn['ReferenceInformationType'] == ['IndexToDirect']
        normals = list(zip(*(iter(nn['Normals'][0]),)*3))
        normal_idx = nn['NormalsIndex'][0]
        uv_values = list(zip(*(iter(uu['UV'][0]),)*2))
        assert uu['MappingInformationType'] == ['ByPolygonVertex'] and uu['ReferenceInformationType'] == ['IndexToDirect']
        uv_idx = uu['UVIndex'][0]
        tris, cursor = [], 0
        for face in faces:
            assert len(face) == 3
            corners = []
            for k, i in enumerate(face):
                corners.append((unity(positions[i]), unity(normals[normal_idx[cursor+k]]), (uv_values[uv_idx[cursor+k]][0], 1-uv_values[uv_idx[cursor+k]][1])))
            tris.append(tuple(corners)); cursor += len(face)
        meta = int(re.search(r'meta(\d+)', g['p'][1]).group(1))
        cases[meta] = {'name': g['p'][1], 'triangles': tris, 'positions': [unity(v) for v in positions]}
    paths = {}
    for n in objects:
        if n['name'] in ('Texture', 'Video'):
            for c in n['c']:
                if c['name'] in ('FileName', 'Filename', 'RelativeFilename'):
                    paths[f"{n['name']}:{c['name']}"] = c['p'][0]
    return {'version': version, 'cases': cases, 'materials': [n['p'][1] for n in objects if n['name'] == 'Material'], 'texture_paths': paths, 'bytes': len(b), 'sha256': sha(b)}


def triangle_key(tri):
    # Preserve normals/UV and triangle multiplicity; ordering checked independently.
    return tuple(sorted((tuple(p), tuple(n), tuple(uv)) for p, n, uv in tri))


def validate_mesh(tris, boxes):
    wrong_normals = wrong_uv = wrong_source_faces = 0
    expected_faces = list(itertools.chain.from_iterable(box_faces(b) for b in boxes))
    for tri in tris:
        pts = [c[0] for c in tri]
        n = normal(pts)
        if any(any(abs(n[a]-c[1][a]) > 1e-8 for a in range(3)) for c in tri):
            wrong_normals += 1
        axis = next((a for a in range(3) if abs(n[a]) == 1), None)
        assert axis is not None
        for p, vn, uv in tri:
            axes = {0: (2, 1), 1: (0, 2), 2: (0, 1)}[axis]
            if uv != (p[axes[0]]/2, 1-p[axes[1]]/2): wrong_uv += 1
        if not any(tuple(n) == en and set(pts) <= set(ep) for ep, en in expected_faces):
            wrong_source_faces += 1
    samples, volume = union_samples(boxes)
    misses = []
    for p, n in samples:
        if not any(tri[0][1] == n and point_on_triangle(p, [c[0] for c in tri]) for tri in tris):
            misses.append((p, n))
    edges = collections.Counter()
    for tri in tris:
        p = [c[0] for c in tri]
        for a, b in ((0, 1), (1, 2), (2, 0)):
            edges[tuple(sorted((p[a], p[b])))] += 1
    return {'triangles': len(tris), 'bounds': bounds([c[0] for tri in tris for c in tri]),
            'coordinate_welded_positions': len({c[0] for tri in tris for c in tri}),
            'coordinate_edge_incidence_histogram': dict(sorted(collections.Counter(edges.values()).items())),
            'wrong_normals': wrong_normals, 'wrong_world2m_uv_corners': wrong_uv,
            'triangles_not_on_original_component_faces': wrong_source_faces,
            'independent_union_boundary_tile_samples': len(samples), 'union_boundary_misses': misses,
            'union_volume_m3': volume}


def main():
    raw = glb(PKG/'exports/iron_trapdoor12_raw16_endpoint_reference_atlas.glb')
    cand = glb(PKG/'exports/iron_trapdoor12_candidate16_endpoint_reference_atlas.glb')
    fb = fbx(PKG/'exports/iron_trapdoor12_candidate16_endpoint_reference_atlas.fbx')
    br = BlendReader(PKG/'source/iron_trapdoor12_internal_cap_reference.blend')
    src = [o for o in br.mesh_objects() if o['name'] != 'PreviewGround']
    snapshots = {s['object_name']: s for s in json.loads((PKG/'reports/trapdoor12-actual-mesh-snapshots.json').read_text())['actual_state_and_comparison_meshes']}
    source_records, source_faces, source_triangle_sets = {}, {}, {}
    material_addresses = set()
    for o in src:
        mesh = o['mesh']; p = [unity(v) for v in mesh['positions']]
        assert mesh['material_slots'] == 1 and len(mesh['uv']) == 1
        uvs = next(iter(mesh['uv'].values()))
        snapshot = snapshots[o['name']]
        assert snapshot['vertices_unity'] == [list(v) for v in p]
        assert snapshot['faces'] == mesh['faces']
        assert snapshot['face_loop_uv'] == [[list(uv) for uv in uvs[mesh['face_offsets'][i]:mesh['face_offsets'][i+1]]] for i in range(len(mesh['faces']))]
        triangles, facekeys = [], []
        for i, face in enumerate(mesh['faces']):
            assert len(face) == 4
            pts = [p[k] for k in face]; n = normal(pts)
            uv = [(u, 1-v) for u, v in uvs[mesh['face_offsets'][i]:mesh['face_offsets'][i+1]]]
            corner = list(zip(pts, [n]*4, uv))
            for ii in ((0, 1, 2), (0, 2, 3)):
                triangles.append(tuple(corner[k] for k in ii))
            facekeys.append(face_key(pts, n))
        meta = int(re.search(r'meta(\d+)', o['name']).group(1))
        boxes, _, _ = expected_boxes(meta)
        record = validate_mesh(triangles, boxes)
        assert record['wrong_normals'] == record['wrong_world2m_uv_corners'] == record['triangles_not_on_original_component_faces'] == 0
        assert not record['union_boundary_misses']
        record.update({'actual_saved_mesh_vertices': len(mesh['positions']),
                       'actual_saved_quad_faces': len(mesh['faces']),
                       'expanded_triangle_corners': len(triangles)*3})
        source_records[o['name']] = record
        source_faces[o['name']] = facekeys
        source_triangle_sets[o['name']] = collections.Counter(map(triangle_key, triangles))
        if o['name'].startswith('TRAPDOOR12_'):
            mode = 'candidate' if '_candidate_' in o['name'] else 'raw'
            export = cand if mode == 'candidate' else raw
            assert collections.Counter(map(triangle_key, triangles)) == collections.Counter(map(triangle_key, export['cases'][meta]['triangles']))
        object_block = next(b for b in br.blocks if b['code'] == b'OB\0\0' and br.id_name(b['data'], 'Object') == o['name'])
        mesh_block = br.block_data(br.value(object_block['data'], 'Object', 'data'))
        material_addresses.add(struct.unpack('<Q', br.block_data(br.value(mesh_block, 'Mesh', 'mat')))[0])
    assert len(src) == 36 and len(material_addresses) == 1
    for mode in ('raw', 'candidate'):
        for meta in (0, 8):
            assert source_triangle_sets[f'COMPARE_trapdoor12_{mode}_meta{meta:02}'] == source_triangle_sets[f'TRAPDOOR12_{mode}_meta{meta:02}']
    packed_images = []
    for block in br.blocks:
        if block['code'] != b'IM\0\0': continue
        ipf = br.value(br.field(block['data'], 'Image', 'packedfiles'), 'ListBase', 'first')
        while ipf:
            d = br.block_data(ipf)
            packed = br.block_data(br.value(d, 'ImagePackedFile', 'packedfile'))
            size = br.value(packed, 'PackedFile', 'size')
            data = br.block_data(br.value(packed, 'PackedFile', 'data'))[:size]
            packed_images.append({'name': br.id_name(block['data'], 'Image'), 'bytes': size, 'sha256': sha(data)})
            ipf = br.value(d, 'ImagePackedFile', 'next')
    approved_image = ROOT/'materials_b/approved_standalone/iron_block_v02/textures/candidate_512/basecolor.png'
    approved_sha = sha(approved_image.read_bytes())
    assert len(packed_images) == 1 and packed_images[0]['sha256'] == approved_sha
    cases, occupancy = {}, set()
    hole_tests = 0
    for meta in range(16):
        boxes, thick_axis, planar_axes = expected_boxes(meta)
        occupancy.add(tuple(boxes))
        rt, ct = raw['cases'][meta]['triangles'], cand['cases'][meta]['triangles']
        rc, cc = collections.Counter(map(triangle_key, rt)), collections.Counter(map(triangle_key, ct))
        assert not cc-rc and len(rt) == 72 and len(ct) == 56
        expected = [face_key(p, n) for p, n in itertools.chain.from_iterable(box_faces(b) for b in boxes)]
        expected_kept = [face_key(p, n) for p, n in itertools.chain.from_iterable(box_faces(b) for b in boxes) if not backed(p, n, boxes)]
        sf_raw = source_faces[f'TRAPDOOR12_raw_meta{meta:02}']
        sf_can = source_faces[f'TRAPDOOR12_candidate_meta{meta:02}']
        assert collections.Counter(sf_raw) == collections.Counter(expected)
        assert collections.Counter(sf_can) == collections.Counter(expected_kept)
        assert len(expected)-len(expected_kept) == 8
        record = validate_mesh(ct, boxes)
        raw_record = validate_mesh(rt, boxes)
        for check in (record, raw_record):
            assert check['wrong_normals'] == check['wrong_world2m_uv_corners'] == check['triangles_not_on_original_component_faces'] == 0
            assert not check['union_boundary_misses'] and check['union_volume_m3'] == .1142578125
        assert record['bounds'] == bounds([v for b in boxes for v in b])
        for uv in itertools.product((.28125, .71875), repeat=2):
            p = [0.0]*3
            p[planar_axes[0]], p[planar_axes[1]] = uv
            # Four hole-centre through-lines, tested at every rendered plane.
            for tri in ct:
                n = tri[0][1]
                if abs(n[thick_axis]) != 1: continue
                p[thick_axis] = tri[0][0][thick_axis]
                assert not point_on_triangle(p, [c[0] for c in tri])
            hole_tests += 1
        f_record = validate_mesh(fb['cases'][meta]['triangles'], boxes)
        assert f_record['triangles'] == 56 and f_record['wrong_normals'] == f_record['wrong_world2m_uv_corners'] == f_record['triangles_not_on_original_component_faces'] == 0
        assert not f_record['union_boundary_misses']
        assert {c for tri in fb['cases'][meta]['triangles'] for c in tri} == {c for tri in ct for c in tri}
        cases[str(meta)] = {'candidate': record, 'raw': raw_record, 'fbx': f_record,
                            'exact_PNUV_raw_triangle_subset': True, 'whole_backed_quads_removed': 8,
                            'source_GLB_triangle_multisets_equal': True,
                            'FBX_surface_corner_set_equal': True,
                            'FBX_literal_triangle_equality': collections.Counter(map(triangle_key, fb['cases'][meta]['triangles'])) == cc}
    assert len(occupancy) == 6
    for result in (raw, cand):
        assert len(result['cases']) == 16 and len(result['json']['materials']) == 1
        state_nodes = [n for n in result['json']['nodes'] if 'mesh' in n]
        assert len(state_nodes) == 16 and {n['mesh'] for n in state_nodes} == set(range(16))
        for node in state_nodes:
            assert int(re.search(r'meta(\d+)', node['name']).group(1)) == node['extras']['metadata_reference']
            assert not any(k in node for k in ('rotation', 'scale', 'matrix'))
        material = result['json']['materials'][0]
        assert material.get('alphaMode', 'OPAQUE') == 'OPAQUE' and material.get('doubleSided', False) is False
        assert result['embedded_images'][0]['sha256'] == approved_sha
    artifact_hashes = {str(p.relative_to(PKG)): sha(p.read_bytes()) for p in list((PKG/'exports').glob('*'))+list((PKG/'source').glob('*.blend'))}
    reported_hashes = json.loads((PKG/'reports/trapdoor12-build-render.json').read_text())['artifact_sha256']
    assert all(reported_hashes[k] == v for k, v in artifact_hashes.items())
    contact_names = ['trapdoor12_candidate_front_contact.png', 'trapdoor12_candidate_reverse_under_contact.png', 'trapdoor12_candidate_front256_contact.png', 'trapdoor12_raw_candidate_closed_open_contact.png']
    pixel_report = json.loads((PKG/'reports/trapdoor12-labeled-views-and-pixel-comparison.json').read_text())
    for path, value in pixel_report['contact_image_sha256'].items():
        assert sha((PKG/path).read_bytes()) == value
    def compare_images(n1, n2):
        a = np.array(Image.open(PKG/'previews'/n1).convert('RGB'), dtype=np.int16)
        b = np.array(Image.open(PKG/'previews'/n2).convert('RGB'), dtype=np.int16)
        diff = abs(a-b)
        return {'MAD_RGB_0_255': float(diff.mean()), 'max_channel_difference': int(diff.max()),
                'pixels_any_channel_difference_gt2': int((diff.max(axis=2)>2).sum())}
    pixel_checks = {
        'raw_candidate_same_camera': compare_images('trapdoor12_raw_front_raw.png', 'trapdoor12_candidate_front_raw.png'),
        'candidate512_256_same_camera': compare_images('trapdoor12_candidate_front_raw.png', 'trapdoor12_candidate_front256_raw.png')}
    assert all(pixel_report[k] == v for k, v in pixel_checks.items())
    for mode, export in [('raw', raw), ('candidate', cand)]:
        for meta, case in export['cases'].items():
            cases[str(meta)][mode]['actual_GLB_POSITION_accessor_vertices'] = len(case['positions'])
    report_hashes = {str(p.relative_to(PKG)): sha(p.read_bytes()) for p in list((PKG/'reports').glob('*.json'))+[PKG/'SPECS_AND_SCOPE.md']}
    catalog = json.loads((ROOT/'inventory/catalog_snapshot.json').read_text())
    shape12_names = [b['name'] for b in catalog['blocks'] if b['shape'] == 12]
    assert len(catalog['blocks']) == 645 and set(shape12_names) == {'spruce_trapdoor', 'dark_oak_trapdoor', 'iron_trapdoor'}
    result = {'review': 'independent limited offline geometry reference only',
              'method': 'Historical C# read, independent source-contract boxes, direct SDNA/GLB/FBX byte parsing; no Blender process/import, render, Unity, Codex, native source changes or phone run',
              'expected_source': 'historical 0956b0777cf007a7a3b1ed799f7ade777f14c80d, ChunkMeshGenerator.cs:964-1042, Vox.cs:101-127, VoxelBlockPhysics.cs:40-44',
              'independent_checks_pass': True, 'limited_offline_geometry_reference_pass': True,
              'metadata_endpoints': 16, 'distinct_occupancies': 6,
              'historical_catalog_names': 645, 'historical_shape12_names': shape12_names,
              'source_target_meshes': len(src), 'source_preview_helper_meshes': 1,
              'GLB_state_meshes': len(raw['cases'])+len(cand['cases']), 'FBX_candidate_geometries': len(fb['cases']),
              'one_shared_source_target_material': True, 'GLB_one_material_single_sided_opaque': True,
              'approved_512_map_sha256': approved_sha, 'source_packed_images': packed_images,
              'costs': {k: {f: d[f] for f in ['bytes', 'unique_mesh_range_bytes', 'accessor_reference_range_sum', 'embedded_images']} for k, d in [('raw_GLB', raw), ('candidate_GLB', cand)]},
              'physical_mesh_range_saving_B': raw['unique_mesh_range_bytes']-cand['unique_mesh_range_bytes'],
              'whole_GLB_saving_B': raw['bytes']-cand['bytes'], 'file_bytes_not_runtime_allocation_or_frame_measurement': True,
              'source_cases': source_records, 'state_cases': cases,
              'independent_boundary_sample_scheme': 'One skew interior point on every exposed source-union grid tile, 78 per endpoint per mesh; independent from maker 234-per-state sampling',
              'candidate_boundary_samples_total': sum(c['candidate']['independent_union_boundary_tile_samples'] for c in cases.values()),
              'four_hole_through_line_tests': hole_tests,
              'collider_reference': {'historical_original_solid_sheet_volume_m3': .1875, 'visual_union_volume_m3': .1142578125, 'difference_m3': .0732421875, 'unchanged_reference_only': True, 'render_candidate_is_not_closed_union_or_approved_collider': True},
              'FBX': {k: v for k, v in fb.items() if k != 'cases'},
              'artifact_sha256': artifact_hashes,
              'reviewed_maker_reports_and_specs_sha256': report_hashes,
              'independently_recomputed_existing_preview_pixel_differences': pixel_checks,
              'contact_images_actually_viewed_full_frame': contact_names,
              'visual_finding': 'Four holes and thickness visible, final frame centered without cropping; conspicuous black central crossing patch in candidate512,256,reverse-under and raw comparison; raw overlap preserved. No finished production art approval.',
              'author_roundtrip_report': 'Read as maker evidence only; 48 author imports are not independent imports.',
              'report_wording_correction': 'Maker corrected source serialized_vertices216/168 to expanded_triangle_corners and separately recorded actual_saved_mesh_vertices144/112, saved_quads36/28. Existing roundtrip import vertex array count was not recorded and is explicitly unclaimed; no new import was run.',
              'limitations': ['Native UV0(texId,0), tint, metallic shader, neighbor culling and native attributes untested', 'No animated hinge/pivot/sweep, body overlap safety, picking, save/dirty-region/cross-chunk test', 'No new collision implementation, Unity import or actual phone test', 'Iron approved artwork reused; no wood variant art approval; black overlap prevents production-art pass'],
              'new_material_art_approvals': 0, 'finished_production_art_pass': False, 'full_block_accepted': False, 'native_integrated': False, 'mobile_pass': False}
    OUT.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps({k: result[k] for k in ['independent_checks_pass', 'metadata_endpoints', 'distinct_occupancies', 'source_target_meshes', 'GLB_state_meshes', 'FBX_candidate_geometries', 'physical_mesh_range_saving_B', 'whole_GLB_saving_B', 'candidate_boundary_samples_total', 'four_hole_through_line_tests']}, indent=2))
    print(OUT)


if __name__ == '__main__':
    main()
