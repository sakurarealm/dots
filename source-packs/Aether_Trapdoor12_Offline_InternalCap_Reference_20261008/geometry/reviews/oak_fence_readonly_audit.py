"""Independent read-only oak fence audit. Never invokes Blender, Unity or Codex.

Reads the supplied FBX/GLB, archived v01 exports, previews and source bytes.
Writes only the adjacent independent review JSON. Requires installed Pillow and
zstandard solely for decoding existing PNG / compressed .blend bytes.
"""
from pathlib import Path
import collections
import hashlib
import io
import json
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
BOXES = [
    ((.375, 0., .375), (.625, 1., .625)),
    ((0., .375, .4375), (.5, .625, .5625)),
    ((0., .75, .4375), (.5, 1., .5625)),
    ((.5, .375, .4375), (1., .625, .5625)),
    ((.5, .75, .4375), (1., 1., .5625)),
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sub(a, b):
    return tuple(a[i] - b[i] for i in range(3))


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2],
            a[0]*b[1]-a[1]*b[0])


def dot(a, b):
    return sum(a[i]*b[i] for i in range(3))


def occupied(p):
    # The union contains contact partitions between boxes. Strict per-box
    # inequalities falsely classify a point on the stairs' y=.5 partition as
    # empty. Surface probes already offset by 1e-5 along their normal.
    return any(all(lo[a] <= p[a] <= hi[a] for a in range(3))
               for lo, hi in BOXES)


def read_glb(path):
    raw = path.read_bytes()
    magic, version, total = struct.unpack_from('<III', raw)
    assert magic == 0x46546C67 and version == 2 and total == len(raw)
    cursor = 12
    js = binary = None
    while cursor < len(raw):
        count, kind = struct.unpack_from('<II', raw, cursor)
        chunk = raw[cursor+8:cursor+8+count]
        cursor += 8+count
        if kind == 0x4E4F534A:
            js = json.loads(chunk)
        elif kind == 0x004E4942:
            binary = chunk
    assert js is not None and binary is not None

    def accessor(index):
        item = js['accessors'][index]
        view = js['bufferViews'][item['bufferView']]
        arity = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[item['type']]
        code = {5126: 'f', 5123: 'H', 5125: 'I', 5121: 'B'}[item['componentType']]
        fmt = '<'+code*arity
        step = view.get('byteStride', struct.calcsize(fmt))
        start = view.get('byteOffset', 0)+item.get('byteOffset', 0)
        return [struct.unpack_from(fmt, binary, start+i*step)
                for i in range(item['count'])]

    assert len(js['meshes']) == 1
    assert len(js['meshes'][0]['primitives']) == 1
    primitive = js['meshes'][0]['primitives'][0]
    assert primitive.get('mode', 4) == 4
    values = {name: accessor(index) for name, index in primitive['attributes'].items()}
    values['INDEX'] = [x[0] for x in accessor(primitive['indices'])]
    image_view = js['bufferViews'][js['images'][0]['bufferView']]
    start = image_view.get('byteOffset', 0)
    image_bytes = binary[start:start+image_view['byteLength']]
    accessor_ids = list(primitive['attributes'].values())+[primitive['indices']]
    payload = sum(js['accessors'][i]['count']
                  * {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[js['accessors'][i]['type']]
                  * {5126: 4, 5123: 2, 5125: 4, 5121: 1}[js['accessors'][i]['componentType']]
                  for i in accessor_ids)
    return js, values, hashlib.sha256(image_bytes).hexdigest(), payload


def mesh_checks(positions, faces, normals=None, boundary_samples=False, uv=None):
    area = volume = 0.
    edges = collections.Counter()
    directions = collections.Counter()
    degenerate = normal_fail = boundary_fail = sample_count = uv_fail = axis_fail = 0
    classes = collections.Counter()
    for face in faces:
        for a, b in zip(face, face[1:]+face[:1]):
            pa, pb = positions[a], positions[b]
            edges[tuple(sorted((pa, pb)))] += 1
            directions[(pa, pb)] += 1
        for k in range(1, len(face)-1):
            ids = (face[0], face[k], face[k+1])
            tri = [positions[i] for i in ids]
            cr = cross(sub(tri[1], tri[0]), sub(tri[2], tri[0]))
            length = math.sqrt(dot(cr, cr))
            area += length*.5
            volume += dot(tri[0], cross(tri[1], tri[2]))/6
            if length < 1e-12:
                degenerate += 1
                continue
            normal = tuple(x/length for x in cr)
            if max(abs(x) for x in normal) < .999999:
                axis_fail += 1
            if normals and any(dot(normals[i], normal) < 1.-1e-5 for i in ids):
                normal_fail += 1
            if uv:
                center = [sum(p[a] for p in tri)/3 for a in range(3)]
                axis = max(range(3), key=lambda a: abs(normal[a]))
                rail = center[0] < .375-1e-6 or center[0] > .625+1e-6
                axes = (2, 1) if axis == 0 else (0, 2) if axis == 1 else (0, 1)
                if rail and axis != 0:
                    axes = (2, 0) if axis == 1 else (1, 0)
                classes[('rail_x' if rail else 'post')+'_normal_axis_'+str(axis)] += 1
                for i in ids:
                    expected = (positions[i][axes[0]]*.5, 1.-positions[i][axes[1]]*.5)
                    if max(abs(uv[i][a]-expected[a]) for a in range(2)) > 1e-6:
                        uv_fail += 1
            if boundary_samples:
                for i in range(1, 12):
                    for j in range(1, 12-i):
                        weights = (i/12, j/12, (12-i-j)/12)
                        point = tuple(sum(weights[z]*tri[z][a] for z in range(3)) for a in range(3))
                        inside = tuple(point[a]-1e-5*normal[a] for a in range(3))
                        outside = tuple(point[a]+1e-5*normal[a] for a in range(3))
                        sample_count += 1
                        if not occupied(inside) or occupied(outside):
                            boundary_fail += 1
    return {
        'triangles': sum(len(f)-2 for f in faces),
        'serialized_vertices': len(positions),
        'coordinate_welded_positions': len(set(positions)),
        'bounds': [[min(p[a] for p in positions) for a in range(3)],
                   [max(p[a] for p in positions) for a in range(3)]],
        'surface_area_m2': area, 'signed_volume_m3': volume,
        'degenerate_triangles': degenerate,
        'coordinate_welded_non_two_incidence_edges': sum(v != 2 for v in edges.values()),
        'edge_orientation_mismatches': sum(directions[(a, b)] != directions[(b, a)] for a, b in edges),
        'normal_mismatch_triangles': normal_fail,
        'non_axis_aligned_triangles': axis_fail,
        'boundary_sample_count': sample_count, 'boundary_sample_failures': boundary_fail,
        'directional_uv_vertex_checks_failed': uv_fail,
        'directional_uv_triangle_classes': dict(classes),
    }


def read_fbx(path):
    raw = path.read_bytes()
    assert raw.startswith(b'Kaydara FBX Binary')
    version = struct.unpack_from('<I', raw, 23)[0]
    fmt, sentinel = ('<QQQB', 25) if version >= 7500 else ('<IIIB', 13)
    header_length = struct.calcsize(fmt)

    def element(offset):
        end, count, propbytes, name_length = struct.unpack_from(fmt, raw, offset)
        if not end:
            return None, offset+sentinel
        p = offset+header_length
        name = raw[p:p+name_length].decode()
        p += name_length
        props = []
        for _ in range(count):
            kind = chr(raw[p])
            p += 1
            if kind in 'YCFDIL':
                code = {'Y': 'h', 'C': '?', 'F': 'f', 'D': 'd', 'I': 'i', 'L': 'q'}[kind]
                props.append(struct.unpack_from('<'+code, raw, p)[0])
                p += struct.calcsize(code)
            elif kind in 'SR':
                length = struct.unpack_from('<I', raw, p)[0]
                p += 4
                data = raw[p:p+length]
                p += length
                props.append(data.decode(errors='replace') if kind == 'S' else data)
            elif kind in 'fdlibc':
                length, encoding, size = struct.unpack_from('<III', raw, p)
                p += 12
                data = raw[p:p+size]
                p += size
                if encoding:
                    data = zlib.decompress(data)
                code = {'f': 'f', 'd': 'd', 'l': 'q', 'i': 'i', 'b': '?', 'c': 'b'}[kind]
                props.append(list(struct.unpack('<'+code*length, data)))
            else:
                raise ValueError('Unsupported FBX property '+kind)
        children = []
        while p < end-sentinel:
            child, p = element(p)
            if child:
                children.append(child)
        return {'name': name, 'props': props, 'children': children}, end

    cursor, roots = 27, []
    while cursor < len(raw):
        item, cursor = element(cursor)
        if not item:
            break
        roots.append(item)

    def walk(item):
        yield item
        for child in item['children']:
            yield from walk(child)

    flat = [item for root in roots for item in walk(root)]
    geometry = [item for item in flat if item['name'] == 'Geometry']
    assert len(geometry) == 1
    children = geometry[0]['children']
    fields = {item['name']: item for item in children}
    coordinates = fields['Vertices']['props'][0]
    local_positions = list(zip(*(iter(coordinates),)*3))
    # Supplied local mesh coordinates use Blender X/-Z/Y. Validate canonical
    # geometry here; FBX object centimeter/unit import remains a runtime gate.
    positions = [(p[0], p[2], -p[1]) for p in local_positions]
    faces, face = [], []
    for index in fields['PolygonVertexIndex']['props'][0]:
        face.append(index if index >= 0 else -index-1)
        if index < 0:
            faces.append(face)
            face = []
    result = mesh_checks(positions, faces, boundary_samples=True)
    result['format_version'] = version
    result['material_object_count'] = sum(item['name'] == 'Material' for item in flat)
    result['uv_layer_names'] = [next(x['props'][0] for x in item['children'] if x['name'] == 'Name')
                                for item in children if item['name'] == 'LayerElementUV']
    result['model_transforms_and_units'] = [item['props'] for item in flat if item['name'] == 'P'
        and item['props'][0] in ('UnitScaleFactor', 'Lcl Rotation', 'Lcl Scaling', 'Lcl Translation')]
    return result


def main():
    from PIL import Image, ImageChops
    import zstandard

    output = {
        'reviewer': 'Independent fence geometry/visual review',
        'scope': 'Read-only artifact audit and existing-image visual inspection; no source edits or rerenders',
        'source_state': 'Supplied historical 0956b077 sources; latest repository revision not established',
        'engine_executed': False, 'blender_executed': False, 'device_test': False,
        'canonical_expected_boxes_unity': BOXES,
        'glb': {}, 'fbx': {}, 'images': {}, 'artifact_sha256': {},
    }
    parsed = {}
    for name in ('oak_fence_mobile_candidate.glb', 'oak_fence_box_combo_comparison.glb'):
        path = ROOT/'exports'/name
        js, data, texture_hash, payload = read_glb(path)
        parsed[name] = data
        faces = [data['INDEX'][i:i+3] for i in range(0, len(data['INDEX']), 3)]
        result = mesh_checks(data['POSITION'], faces, data['NORMAL'], True,
                             data['TEXCOORD_0'] if 'mobile_candidate' in name else None)
        result.update({
            'attributes': list(js['meshes'][0]['primitives'][0]['attributes']),
            'material_count': len(js['materials']),
            'primitive_count': len(js['meshes'][0]['primitives']),
            'node_transforms': js['nodes'],
            'material': js['materials'][0],
            'embedded_texture_sha256': texture_hash,
            'actual_serialized_mesh_accessor_payload_bytes': payload,
            'file_bytes': path.stat().st_size,
            'serialized_gltf_uv_bounds': [[min(p[a] for p in data['TEXCOORD_0']) for a in range(2)],
                                           [max(p[a] for p in data['TEXCOORD_0']) for a in range(2)]],
        })
        output['glb'][name] = result
        output['artifact_sha256'][str(path.relative_to(ROOT))] = sha(path)
    old_js, old, _, old_payload = read_glb(ROOT/'revisions/v01/exports/oak_fence_mobile_candidate.glb')
    candidate = parsed['oak_fence_mobile_candidate.glb']
    output['secondary_uv_optimization'] = {
        'unchanged_values': {name: candidate[name] == old[name]
                             for name in ('POSITION', 'NORMAL', 'TEXCOORD_0', 'INDEX')},
        'old_attributes': list(old_js['meshes'][0]['primitives'][0]['attributes']),
        'old_mesh_accessor_payload_bytes': old_payload,
        'new_mesh_accessor_payload_bytes': output['glb']['oak_fence_mobile_candidate.glb']['actual_serialized_mesh_accessor_payload_bytes'],
        'removed_payload_bytes': old_payload-output['glb']['oak_fence_mobile_candidate.glb']['actual_serialized_mesh_accessor_payload_bytes'],
        'scope': 'Serialized export stream only; no claim about native chunk/GPU memory',
    }
    for name in ('oak_fence_master.fbx', 'oak_fence_mobile_candidate.fbx', 'oak_fence_box_combo_comparison.fbx'):
        path = ROOT/'exports'/name
        output['fbx'][name] = read_fbx(path)
        output['artifact_sha256'][str(path.relative_to(ROOT))] = sha(path)
    for name in ('master_geometry', 'optimized_geometry', 'optimized_mobile256', 'back_low', 'clay'):
        path = ROOT/'previews'/('oak_fence_'+name+'.png')
        current = Image.open(path).convert('RGB')
        archived = Image.open(ROOT/'revisions/v01/previews'/path.name).convert('RGB')
        output['images'][name] = {'dimensions': list(current.size),
            'v01_same_pixels': ImageChops.difference(current, archived).getbbox() is None,
            'actually_viewed_by_reviewer': True}
        output['artifact_sha256'][str(path.relative_to(ROOT))] = sha(path)
    a = Image.open(ROOT/'previews/oak_fence_master_geometry.png').convert('RGB')
    b = Image.open(ROOT/'previews/oak_fence_optimized_geometry.png').convert('RGB')
    histogram = ImageChops.difference(a, b).histogram()
    aa, bb = list(a.getdata()), list(b.getdata())
    output['master_candidate_same_view'] = {
        'MAD_RGB255': sum((i % 256)*count for i, count in enumerate(histogram))/(a.width*a.height*3),
        'pixels_any_channel_difference_gt2': sum(any(abs(x-y) > 2 for x, y in zip(p, q)) for p, q in zip(aa, bb)),
    }
    source = ROOT/'source/oak_fence_master_and_candidate.blend'
    decoded = zstandard.ZstdDecompressor().stream_reader(io.BytesIO(source.read_bytes())).read()
    shared = ROOT.parent/'materials_a/textures/oak_planks/candidate_512/basecolor.png'
    texture_bytes = shared.read_bytes()
    output['source_binary_readonly_checks'] = {
        'decoded_blend_header': decoded[:12].decode(),
        'exact_shared_png_found_packed': texture_bytes in decoded,
        'shared_texture_sha256': sha(shared),
        'object_and_uv_names_present': {name.decode(): name in decoded for name in (
            b'MASTER_oak_fence', b'OPT_oak_fence', b'BOX_COMBO_60_oak_fence',
            b'ReviewUV_2mRepeat_RailDirectional', b'Historical_UV0_texId_DO_NOT_BIND')},
        'scope': 'Binary presence and exact packed image bytes; not an interactive editability or visibility test',
    }
    output['artifact_sha256'][str(source.relative_to(ROOT))] = sha(source)
    state_audit = json.loads((ROOT/'reports/state-mesh-audit.json').read_text())
    fence_rows = [row for row in state_audit['cases'] if row['shape'] == 'fence']
    consistency = []
    for row in fence_rows:
        mask = row['review_connection_mask']
        expected_low = [0. if mask & 2 else .375, 0., 0. if mask & 4 else .375]
        expected_high = [1. if mask & 8 else .625, 1., 1. if mask & 1 else .625]
        consistency.append({'mask': mask, 'reported_triangles': row['triangles'],
            'volume_consistent': abs(row['volume_m3']-(.0625+.0234375*mask.bit_count())) < 1e-8,
            'area_consistent': abs(row['surface_area_m2']-(1.125+.5625*mask.bit_count())) < 1e-8,
            'bounds_consistent': row['bounds_unity'] == [expected_low, expected_high],
            'reported_visual_state_review': row['visual_state_review']})
    output['supplied_all_state_report_consistency'] = {
        'fence_case_count': len(fence_rows), 'cases': consistency,
        'scope': 'Consistency check of supplied derived-state report, not independent generated/exported all-state meshes or engine execution',
    }
    representative = output['glb']['oak_fence_mobile_candidate.glb']
    geometry_verified = (
        representative['triangles'] == 84
        and representative['bounds'] == [[0., 0., .375], [1., 1., .625]]
        and abs(representative['surface_area_m2']-2.25) < 1e-8
        and abs(representative['signed_volume_m3']-.109375) < 1e-8
        and all(representative[field] == 0 for field in (
            'degenerate_triangles', 'coordinate_welded_non_two_incidence_edges',
            'edge_orientation_mismatches', 'normal_mismatch_triangles',
            'non_axis_aligned_triangles', 'boundary_sample_failures',
            'directional_uv_vertex_checks_failed'))
        and representative['attributes'] == ['POSITION', 'NORMAL', 'TEXCOORD_0']
        and representative['material_count'] == 1
        and representative['primitive_count'] == 1)
    output['decision'] = {
        'overall': 'candidate',
        'representative_offline_geometry': 'verified' if geometry_verified else 'failed',
        'representative_visual': 'retain_as_offline_visual_technical_sample',
        'all_state_block_accepted': False, 'mobile_pass': False,
        'runtime_option_selected': False,
        'opaque_glb_backface_culling_pending': any(result['material'].get('doubleSided', False)
            for result in output['glb'].values()),
    }
    target = Path(__file__).with_name('oak_fence_v02_independent_audit.json')
    target.write_text(json.dumps(output, indent=2)+'\n')
    print(json.dumps({'report': str(target), 'decision': output['decision'],
        'candidate': output['glb']['oak_fence_mobile_candidate.glb'],
        'box_accessor_bytes': output['glb']['oak_fence_box_combo_comparison.glb']['actual_serialized_mesh_accessor_payload_bytes']}, indent=2))


if __name__ == '__main__':
    main()
