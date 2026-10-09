"""Count per-mesh referenced vs unique physical accessor byte ranges, excluding image/JSON."""
from pathlib import Path
import json,struct,sys

def metrics(path):
    path=Path(path);raw=path.read_bytes();cursor=12;js=None
    while cursor<len(raw):
        n,kind=struct.unpack_from('<II',raw,cursor)
        if kind==0x4e4f534a:js=json.loads(raw[cursor+8:cursor+8+n]);break
        cursor+=8+n
    assert js is not None
    widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4};bytes_per={5126:4,5123:2,5125:4,5121:1}
    refs=[]
    for mesh in js['meshes']:
        for p in mesh['primitives']:refs.extend([*p['attributes'].values(),p['indices']])
    def size(i):
        a=js['accessors'][i];return a['count']*widths[a['type']]*bytes_per[a['componentType']]
    ranges=[]
    for i in set(refs):
        a=js['accessors'][i];v=js['bufferViews'][a['bufferView']];assert v.get('buffer',0)==0
        width=widths[a['type']]*bytes_per[a['componentType']];step=v.get('byteStride',width)
        start=v.get('byteOffset',0)+a.get('byteOffset',0)
        for n in range(a['count']):ranges.append((start+n*step,start+n*step+width))
    ranges.sort();merged=[]
    for a,b in ranges:
        if merged and a<=merged[-1][1]:merged[-1]=(merged[-1][0],max(b,merged[-1][1]))
        else:merged.append((a,b))
    return {'filename':path.name,'mesh_count':len(js['meshes']),
        'per_mesh_referenced_accessor_bytes_sum':sum(size(i) for i in refs),
        'unique_accessor_ids':len(set(refs)),'accessor_reference_count':len(refs),
        'unique_accessor_dataset_byte_sum':sum(size(i) for i in set(refs)),
        'distinct_physical_mesh_byte_ranges_size':sum(b-a for a,b in merged),
        'whole_GLB_file_bytes':len(raw),'includes_texture_JSON_padding_in_mesh_metrics':False,
        'runtime_GPU_or_native_memory_measurement':False}

if __name__=='__main__':
    for p in sys.argv[1:]:print(json.dumps(metrics(p)))
