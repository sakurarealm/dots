"""Independent fence UV demonstration, not a native shader or VertexBuffer patch."""
import json
from pathlib import Path

def part_axis(center):
    if center[0]<.375-1e-6 or center[0]>.625+1e-6:return 0
    if center[2]<.375-1e-6 or center[2]>.625+1e-6:return 2
    return 1

def projection_axes(normal_axis,grain_axis):
    axes=(2,1) if normal_axis==0 else (0,2) if normal_axis==1 else (0,1)
    if grain_axis==0 and normal_axis!=0:axes=(2,0) if normal_axis==1 else (1,0)
    if grain_axis==2 and normal_axis!=2:axes=(0,2) if normal_axis==1 else (1,2)
    return axes

def uv(point,normal_axis,grain_axis,cell_world_origin=(0,0,0),repeat_meters=2.,mode='world_directional'):
    assert repeat_meters>0
    axes=projection_axes(normal_axis,grain_axis)
    if mode=='native_projection_approx':
        axes=(2,1) if normal_axis==0 else (0,2) if normal_axis==1 else (0,1)
    offset=(0,0,0) if mode=='local_reset' else cell_world_origin
    return tuple((point[a]+offset[a])/repeat_meters for a in axes)

def run_contracts():
    rows=[]
    for grain,normal,origin in ((0,2,(1,0,0)),(0,1,(1,0,0)),(2,0,(0,0,1)),(2,1,(0,0,1))):
        axis=grain
        for h in (.375,.5,.625,.75,.875,1.):
            left=[.5,h,.5];right=left.copy();left[axis]=1.;right[axis]=0.
            a=uv(left,normal,grain);b=uv(right,normal,grain,origin)
            reset=uv(right,normal,grain,origin,mode='local_reset')
            assert all(abs(a[i]-b[i])<1e-12 for i in range(2))
            assert max(abs(a[i]-reset[i]) for i in range(2))==.5
            rows.append({'grain_axis':grain,'normal_axis':normal,'join_height':h,
                'world_offset_join_uv_error':0.,'local_reset_join_uv_error':.5})
    # Two cells cover one complete repeat; negative origins do not reset phase.
    for axis in (0,2):
        n=2 if axis==0 else 0
        p=[.5,.5,.5];p[axis]=0.
        o=[0,0,0];o[axis]=2
        a=uv(p,n,axis);b=uv(p,n,axis,o)
        assert all(abs((a[i]%1)-(b[i]%1))<1e-12 for i in range(2))
    return {'scope':'Reference UV arithmetic and review demonstration only; native shader not changed',
      'repeat_meters':2.,'case_count':len(rows),'joins':rows,
      'post_grain_axis':'Y','rail_grain_axis':'X or Z according to connected arm',
      'native_vertex_buffer_uv0':[33,0],
      'native_shader_conflict':'CalcAtlasTriplanarUV uses p.zy/p.xz/p.xy; it knows surface normal but not rail versus post grain axis. Replacing UV0 with surface UV would destroy texId meaning.',
      'required_native_adaptation':'Separately design and verify a grain-axis signal or equivalent shape-aware shader selection while preserving texId, tint, atlas gutters, world phase and shared batching.',
      'native_integrated':False,'mobile_pass':False}

if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    result=run_contracts();(root/'reports'/'world-offset-uv-contract.json').write_text(json.dumps(result,indent=2))
    print('UV_REFERENCE_CONTRACTS_PASS',result['case_count'])
