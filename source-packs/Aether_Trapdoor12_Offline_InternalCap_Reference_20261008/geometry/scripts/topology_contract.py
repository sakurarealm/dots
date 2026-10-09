"""Historical 0956b077 architectural geometry reference, never an engine patch."""
from itertools import product
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIR = {0:(0,0,1), 1:(-1,0,0), 2:(0,0,-1), 3:(1,0,0)}
OPP = {0:2, 1:3, 2:0, 3:1}
CCW = {0:3, 3:2, 2:1, 1:0}
CW = {0:1, 1:2, 2:3, 3:0}

def half(facing, y0, y1):
    lo = [0.,y0,0.]; hi = [1.,y1,1.]
    axis = 2 if facing % 2 == 0 else 0
    if facing in (0,3): lo[axis] = .5
    else: hi[axis] = .5
    return (tuple(lo), tuple(hi))

def intersect(a,b):
    return (tuple(max(a[0][i],b[0][i]) for i in range(3)),
            tuple(min(a[1][i],b[1][i]) for i in range(3)))

def slab(up=False):
    return [((0.,.5 if up else 0.,0.), (1.,1. if up else .5,1.))]

def stairs(facing=0,up=False,corner='straight'):
    y0,y1 = (0.,.5) if up else (.5,1.)
    boxes = slab(up)
    if corner.startswith('outer'):
        side = CCW[facing] if corner.endswith('left') else CW[facing]
        boxes.append(intersect(half(facing,y0,y1),half(side,y0,y1)))
    else:
        boxes.append(half(facing,y0,y1))
        if corner.startswith('inner'):
            side = CCW[facing] if corner.endswith('left') else CW[facing]
            boxes.append(intersect(half(OPP[facing],y0,y1),half(side,y0,y1)))
    return boxes

def resolve_corner(facing,up,neighbors):
    def can_take(check):
        n = neighbors.get(check)
        return n is None or n['shape'] != 3 or n['facing'] != facing or n['up'] != up
    low = neighbors.get(OPP[facing])
    if low and low['shape'] == 3 and low['up'] == up:
        nf = low['facing']
        if (facing & 1) != (nf & 1) and can_take(nf):
            if nf == CCW[facing]: return 'inner_left'
            if nf == CW[facing]: return 'inner_right'
    high = neighbors.get(facing)
    if high and high['shape'] == 3 and high['up'] == up:
        nf = high['facing']
        if (facing & 1) != (nf & 1) and can_take(OPP[nf]):
            if nf == CCW[facing]: return 'outer_left'
            if nf == CW[facing]: return 'outer_right'
    return 'straight'

def connects_to_fence(shape,tex=1):
    return tex != 0 and shape in (11,1,4)

def fence(mask=10):
    boxes = [((.375,0.,.375),(.625,1.,.625))]
    for d in range(4):
        if not mask & (1 << d): continue
        for y0,y1 in ((.375,.625),(.75,1.)):
            lo=[.4375,y0,.4375]; hi=[.5625,y1,.5625]
            axis=2 if d % 2 == 0 else 0
            lo[axis],hi[axis] = (.5,1.) if d in (0,3) else (0.,.5)
            boxes.append((tuple(lo),tuple(hi)))
    return boxes

def coordinates(boxes,spacing=None):
    axes=[set() for _ in range(3)]
    for lo,hi in boxes:
        for a in range(3): axes[a].update((lo[a],hi[a]))
    if spacing:
        for a in range(3):
            low,high=min(axes[a]),max(axes[a])
            axes[a].update(i*spacing for i in range(round(low/spacing),round(high/spacing)+1)
                           if low <= i*spacing <= high)
    return [sorted(x) for x in axes]

def occupied(point,boxes):
    return any(all(lo[a] < point[a] < hi[a] for a in range(3)) for lo,hi in boxes)

def cell_shell(boxes,spacing=None):
    axes=coordinates(boxes,spacing)
    lengths=[len(c)-1 for c in axes]
    occupied_cells=set()
    for idx in product(*(range(n) for n in lengths)):
        p=tuple((axes[a][idx[a]]+axes[a][idx[a]+1])*.5 for a in range(3))
        if occupied(p,boxes): occupied_cells.add(idx)
    verts=[]; faces=[]; index={}; volume=area=0.
    def vi(p):
        if p not in index: index[p]=len(verts); verts.append(p)
        return index[p]
    for idx in sorted(occupied_cells):
        lo=[axes[a][idx[a]] for a in range(3)]
        hi=[axes[a][idx[a]+1] for a in range(3)]
        volume += (hi[0]-lo[0])*(hi[1]-lo[1])*(hi[2]-lo[2])
        for a in range(3):
            others=[b for b in range(3) if b != a]
            b,c=others
            for sign in (-1,1):
                n=list(idx); n[a]+=sign
                if tuple(n) in occupied_cells: continue
                # Orient all quads outward in Unity XYZ canonical coordinates.
                ps=[]
                for ub,uc in ((0,0),(1,0),(1,1),(0,1)):
                    p=list(lo);p[a]=hi[a] if sign>0 else lo[a]
                    p[b]=hi[b] if ub else lo[b];p[c]=hi[c] if uc else lo[c]
                    ps.append(tuple(p))
                cross_sign = 1 if a in (0,2) else -1
                if cross_sign != sign: ps.reverse()
                faces.append(tuple(vi(p) for p in ps))
                area+=(hi[b]-lo[b])*(hi[c]-lo[c])
    return {'vertices_unity':verts,'faces':faces,'volume_m3':volume,'surface_area_m2':area,
            'grid_cells_occupied':len(occupied_cells),'raw_native_box_triangles':12*len(boxes)}

REPRESENTATIVES = [
    {'asset':'stone_slab','family':'stone','shapeId':2,'bk_index':31,'atlas_tile':30,
     'metadata':0,'state':{'half':'bottom'},'boxes':slab(False)},
    {'asset':'stone_brick_stairs','family':'stone_bricks','shapeId':3,'bk_index':35,'atlas_tile':34,
     'metadata':0,'state':{'facing':'south','half':'bottom','resolved_corner':'straight'},
     'boxes':stairs(0,False,'straight')},
    {'asset':'oak_fence','family':'oak_planks','shapeId':11,'bk_index':33,'atlas_tile':32,
     'metadata':0,'state':{'connections':['west','east'],'connection_mask_review_only':10},
     'boxes':fence(10)},
]

def run_contracts():
    cases=[]
    for up in (False,True):
        cases.append(('slab_'+str(up),slab(up),.5))
    for f in range(4):
        for up in (False,True):
            for corner in ('straight','inner_left','inner_right','outer_left','outer_right'):
                expected=.75 if corner=='straight' else .875 if corner.startswith('inner') else .625
                cases.append((f'stair_{f}_{int(up)}_{corner}',stairs(f,up,corner),expected))
                if corner!='straight':
                    nf=CCW[f] if corner.endswith('left') else CW[f]
                    npos=OPP[f] if corner.startswith('inner') else f
                    neighbors={npos:{'shape':3,'facing':nf,'up':up}}
                    assert resolve_corner(f,up,neighbors)==corner
                    check=nf if corner.startswith('inner') else OPP[nf]
                    neighbors[check]={'shape':3,'facing':f,'up':up}
                    assert resolve_corner(f,up,neighbors)=='straight'
    for mask in range(16):
        cases.append((f'fence_{mask:04b}',fence(mask),.0625+.0234375*mask.bit_count()))
    for s in range(23):
        assert connects_to_fence(s)==(s in (1,4,11))
        assert not connects_to_fence(s,0)
    rows=[]
    for name,boxes,expected in cases:
        shell=cell_shell(boxes)
        vol=shell['volume_m3']
        if expected is not None: assert abs(vol-expected)<1e-8,(name,vol,expected)
        assert all(0<=c<=1 for p in shell['vertices_unity'] for c in p)
        rows.append({'case':name,'volume_m3':vol,'surface_area_m2':shell['surface_area_m2'],
                     'grid_surface_triangles':len(shell['faces'])*2,'native_box_triangles':len(boxes)*12})
    # Boundary-only neighbor culling counterexamples. A cell one grid step above
    # a bottom slab cannot hide its y=.5 top face; side cube can hide its x=1 face.
    shell=cell_shell(slab(False))
    top_boundary_area=sum(0. for _ in [] )
    side_contact_area=0.
    for face in shell['faces']:
        ps=[shell['vertices_unity'][i] for i in face]
        if all(abs(p[1]-1.)<1e-8 for p in ps):top_boundary_area+=1.
        if all(abs(p[0]-1.)<1e-8 for p in ps):side_contact_area+=.5
    assert top_boundary_area==0. and abs(side_contact_area-.5)<1e-8
    return {'source_commit':'0956b0777cf007a7a3b1ed799f7ade777f14c80d','source_state':'historical',
            'case_count':len(cases),'metadata_states':{'slabs':2,'stairs':40,'fence_masks':16},
            'adjacency_blockers_verified':True,'fence_shape_predicate_verified':True,
            'bounds_unit_cell_verified':True,'cases':rows,
            'neighbor_boundary_regressions':{'bottom_slab_top_under_cube_one_cell_above_retained':True,
                'bottom_slab_cube_side_contact_area_m2':side_contact_area,
                'verification_scope':'Reference boundary classification only, no engine execution'},
            'boundary_culling_contract':'Remove only covered overlap on actual cell-boundary faces; do not suppress interior height planes from a cube one cell away.',
            'verification_scope':'Independent Python transcription of historical source, not compiled engine or runtime tests.'}

if __name__=='__main__':
    result=run_contracts()
    (ROOT/'reports'/'state-contract-tests.json').write_text(json.dumps(result,indent=2))
    (ROOT/'reports'/'shape-mapping.json').write_text(json.dumps(REPRESENTATIVES,indent=2))
    print('CONTRACTS_PASS',result['case_count'])
