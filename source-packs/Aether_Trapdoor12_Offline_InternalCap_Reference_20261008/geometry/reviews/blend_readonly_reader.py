"""Small read-only Blender 4.03 SDNA reader for mesh/UV audit, not Blender execution."""
import io
import re
import struct
from pathlib import Path
import zstandard


class BlendReader:
    def __init__(self, path):
        stored = Path(path).read_bytes()
        self.raw = (zstandard.ZstdDecompressor().stream_reader(io.BytesIO(stored)).read()
                    if stored.startswith(b'\x28\xb5\x2f\xfd') else stored)
        assert self.raw[:12] == b'BLENDER-v403', 'Reader is limited to supplied 64-bit little-endian 4.03 files'
        self.blocks = []
        cursor = 12
        while cursor < len(self.raw):
            code, length, address, dna_index, count = struct.unpack_from('<4sIQII', self.raw, cursor)
            cursor += 24
            self.blocks.append({'code': code, 'address': address, 'dna_index': dna_index,
                                'count': count, 'data': self.raw[cursor:cursor+length]})
            cursor += length
            if code == b'ENDB':
                break
        self.by_address = {b['address']: b for b in self.blocks if b['address']}
        dna = next(b['data'] for b in self.blocks if b['code'] == b'DNA1')
        assert dna[:8] == b'SDNANAME'
        cursor = 8

        def strings(cursor):
            count = struct.unpack_from('<I', dna, cursor)[0]
            cursor += 4
            result = []
            for _ in range(count):
                end = dna.index(0, cursor)
                result.append(dna[cursor:end].decode())
                cursor = end+1
            return result, (cursor+3)//4*4

        names, cursor = strings(cursor)
        assert dna[cursor:cursor+4] == b'TYPE'
        types, cursor = strings(cursor+4)
        assert dna[cursor:cursor+4] == b'TLEN'
        cursor += 4
        lengths = struct.unpack_from('<'+'H'*len(types), dna, cursor)
        cursor = (cursor+len(types)*2+3)//4*4
        assert dna[cursor:cursor+4] == b'STRC'
        cursor += 4
        count = struct.unpack_from('<I', dna, cursor)[0]
        cursor += 4
        self.schemas = {}
        self.struct_names = []
        self.type_lengths = dict(zip(types, lengths))
        for _ in range(count):
            type_index, field_count = struct.unpack_from('<HH', dna, cursor)
            cursor += 4
            fields = []
            for _ in range(field_count):
                field_type, field_name = struct.unpack_from('<HH', dna, cursor)
                cursor += 4
                fields.append((types[field_type], names[field_name]))
            self.schemas[types[type_index]] = fields
            self.struct_names.append(types[type_index])
        self.layouts = {}

    def layout(self, type_name):
        if type_name in self.layouts:
            return self.layouts[type_name]
        assert type_name in self.schemas
        offset = 0
        result = {}
        for field_type, raw_name in self.schemas[type_name]:
            array = 1
            for value in re.findall(r'\[(\d+)\]', raw_name):
                array *= int(value)
            pointer = '*' in raw_name
            size = (8 if pointer else self.type_lengths[field_type])*array
            # Blender DNA supplies explicit padding; verify the complete known
            # struct length before trusting any computed byte offset.
            clean_name = re.sub(r'\[.*', '', raw_name).replace('*', '')
            result[clean_name] = (offset, size, field_type, pointer, array)
            offset += size
        assert offset == self.type_lengths[type_name], (type_name, offset, self.type_lengths[type_name])
        self.layouts[type_name] = result
        return result

    def field(self, data, type_name, field_name):
        offset, size, field_type, pointer, count = self.layout(type_name)[field_name]
        return data[offset:offset+size]

    def value(self, data, type_name, field_name):
        offset, size, field_type, pointer, count = self.layout(type_name)[field_name]
        codes = {'int': 'i', 'float': 'f', 'short': 'h', 'ushort': 'H', 'char': 'b', 'uchar': 'B'}
        code = 'Q' if pointer else codes[field_type]
        values = struct.unpack('<'+code*count, data[offset:offset+size])
        return values[0] if count == 1 else values

    def block_data(self, address):
        return self.by_address[address]['data']

    def id_name(self, data, type_name):
        identifier = self.field(data, type_name, 'id')
        return self.field(identifier, 'ID', 'name').split(b'\0')[0].decode()[2:]

    def layers(self, data, field_name):
        custom = self.field(data, 'Mesh', field_name)
        count = self.value(custom, 'CustomData', 'totlayer')
        address = self.value(custom, 'CustomData', 'layers')
        if not count:
            return {}
        raw = self.block_data(address)
        stride = self.type_lengths['CustomDataLayer']
        result = {}
        for index in range(count):
            layer = raw[index*stride:(index+1)*stride]
            name = self.field(layer, 'CustomDataLayer', 'name').split(b'\0')[0].decode()
            result[name] = {'type': self.value(layer, 'CustomDataLayer', 'type'),
                            'data': self.block_data(self.value(layer, 'CustomDataLayer', 'data'))}
        return result

    def mesh(self, address):
        raw = self.block_data(address)
        vertices = self.value(raw, 'Mesh', 'totvert')
        polygons = self.value(raw, 'Mesh', 'totpoly')
        loops = self.value(raw, 'Mesh', 'totloop')
        vdata = self.layers(raw, 'vdata')
        ldata = self.layers(raw, 'ldata')
        positions = list(zip(*(iter(struct.unpack('<'+'f'*vertices*3, vdata['position']['data'])),)*3))
        corner_vertices = struct.unpack('<'+'i'*loops, ldata['.corner_vert']['data'])
        face_offsets = struct.unpack('<'+'i'*(polygons+1), self.block_data(self.value(raw, 'Mesh', 'poly_offset_indices')))
        faces = [list(corner_vertices[face_offsets[i]:face_offsets[i+1]]) for i in range(polygons)]
        uv = {name: list(zip(*(iter(struct.unpack('<'+'f'*loops*2, layer['data'])),)*2))
              for name, layer in ldata.items() if layer['type'] == 49}
        return {'name': self.id_name(raw, 'Mesh'), 'positions': positions, 'faces': faces,
                'face_offsets': list(face_offsets), 'uv': uv,
                'material_slots': self.value(raw, 'Mesh', 'totcol')}

    def mesh_objects(self):
        result = []
        for block in self.blocks:
            if block['code'] != b'OB\0\0':
                continue
            raw = block['data']
            if self.value(raw, 'Object', 'type') != 1:
                continue
            result.append({'name': self.id_name(raw, 'Object'),
                           'location': self.value(raw, 'Object', 'loc'),
                           'rotation': self.value(raw, 'Object', 'rot'),
                           'scale': self.value(raw, 'Object', 'size'),
                           'mesh': self.mesh(self.value(raw, 'Object', 'data'))})
        return result
