"""Dedicated actual-geometry / CPU raster core. No diagnostic scene or fixture included."""
import numpy as np
import math, types
from scipy.spatial import ConvexHull
from PIL import Image
F=np.float32
OBJECTS=[]
def unit(a):
    a = np.asarray(a, dtype=F)
    return a / np.maximum(np.linalg.norm(a, axis=-1, keepdims=True), 1e-09)

def euler(x, y, z):
    cx, sx, cy, sy, cz, sz = (math.cos(x), math.sin(x), math.cos(y), math.sin(y), math.cos(z), math.sin(z))
    return np.array([[cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx], [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx], [-sy, cy * sx, cy * cx]], dtype=F)

class Ob:

    def __init__(self, p, t, n=None, loc=(0, 0, 0), rot=(0, 0, 0)):
        self.p = np.asarray(p, dtype=F)
        self.t = np.asarray(t, dtype=np.int32)
        self.n = None if n is None else np.asarray(n, dtype=F)
        self.loc = np.asarray(loc, dtype=F)
        self.rot = rot
        self.modifiers = types.SimpleNamespace(new=lambda *a: types.SimpleNamespace(thickness=0))
        self.name = ''
        self.kind = ''

def register(ob, name, kind, bevel=0, smooth=False):
    ob.name = name
    ob.kind = kind
    if ob not in OBJECTS:
        OBJECTS.append(ob)
    return ob

def cube(name, loc, dim, kind, bevel=0.015, rot=None):
    h = np.asarray(dim, dtype=F) / 2
    b = min(bevel, float(h.min()) * 0.45)
    if b:
        p = []
        for axis in range(3):
            for sx in [-1, 1]:
                for sy in [-1, 1]:
                    for sz in [-1, 1]:
                        v = (h - b) * np.array([sx, sy, sz], dtype=F)
                        v[axis] = h[axis] * [sx, sy, sz][axis]
                        p.append(v)
        p = np.asarray(p, dtype=F)
        t = ConvexHull(p).simplices.copy()
    else:
        p = np.array([[x * h[0], y * h[1], z * h[2]] for x in [-1, 1] for y in [-1, 1] for z in [-1, 1]], dtype=F)
        t = ConvexHull(p).simplices.copy()
    for i, tri in enumerate(t):
        v = p[tri]
        if np.dot(np.cross(v[1] - v[0], v[2] - v[0]), v.mean(axis=0)) < 0:
            t[i] = tri[[0, 2, 1]]
    return register(Ob(p, t, loc=loc, rot=rot or (0, 0, 0)), name, kind)

def mesh(name, vs, fs, kind, smooth=False):
    p = np.asarray(vs, dtype=F)
    t = []
    for face in fs:
        for j in range(1, len(face) - 1):
            t.append((face[0], face[j], face[j + 1]))
    n = None
    if smooth:
        n = np.zeros_like(p)
        for face in t:
            v = p[list(face)]
            fn = np.cross(v[1] - v[0], v[2] - v[0])
            n[list(face)] += fn
        n = unit(n)
    return register(Ob(p, t, n), name, kind)

def project(pos, eye, target, w, h, width):
    forward = unit(np.asarray(eye, dtype=F) - target)
    right = unit(np.cross((0, 0, 1), forward))
    up = np.cross(forward, right)
    q = pos - target
    xy = np.stack((q @ right, -q @ up), axis=-1) * (w / width) + np.array([w / 2, h / 2], dtype=F)
    z = q @ forward
    return (xy, z, forward, right, up)

def fragments(xy, z, w, h):
    x0 = max(0, int(np.floor(xy[:, 0].min())))
    x1 = min(w, int(np.ceil(xy[:, 0].max())) + 1)
    y0 = max(0, int(np.floor(xy[:, 1].min())))
    y1 = min(h, int(np.ceil(xy[:, 1].max())) + 1)
    if x1 <= x0 or y1 <= y0:
        return None
    a, b, c = xy
    den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(den) < 1e-07:
        return None
    yy, xx = np.mgrid[y0:y1, x0:x1]
    xx = xx.ravel()
    yy = yy.ravel()
    X = xx + 0.5
    Y = yy + 0.5
    u = ((b[1] - c[1]) * (X - c[0]) + (c[0] - b[0]) * (Y - c[1])) / den
    v = ((c[1] - a[1]) * (X - c[0]) + (a[0] - c[0]) * (Y - c[1])) / den
    t = 1 - u - v
    inside = (u >= -1e-05) & (v >= -1e-05) & (t >= -1e-05)
    bc = np.column_stack((u[inside], v[inside], t[inside])).astype(F)
    return (xx[inside], yy[inside], bc, bc @ z)

def gbuffer(mesh, w, h):
    pos = mesh['position']
    xy, z, view, *_ = project(pos, np.array([6.6, -10, 6.1], dtype=F), np.array([0, 0, 1.05], dtype=F), w, h, 6.0)
    depth = np.full((h, w), -np.inf, dtype=F)
    P = np.zeros((h, w, 3), dtype=F)
    N = P.copy()
    T = P.copy()
    B = P.copy()
    UV = np.zeros((h, w, 2), dtype=F)
    M = np.full((h, w), 255, dtype=np.uint8)
    C = np.zeros((h, w), dtype=np.uint8)
    LOD = np.zeros((h, w), dtype=np.uint8)
    for i, p in enumerate(pos):
        f = fragments(xy[i], z[i], w, h)
        if f is None:
            continue
        x, y, bc, zz = f
        inside = zz > depth[y, x]
        if not inside.any():
            continue
        x, y, bc, zz = (x[inside], y[inside], bc[inside], zz[inside])
        n = unit(bc @ mesh['normal'][i])
        uv = bc @ mesh['uv'][i]
        n = np.where((n @ view < 0)[:, None], -n, n)
        edge1, edge2 = (p[1] - p[0], p[2] - p[0])
        d1, d2 = (mesh['uv'][i, 1] - mesh['uv'][i, 0], mesh['uv'][i, 2] - mesh['uv'][i, 0])
        det = d1[0] * d2[1] - d1[1] * d2[0]
        ta = unit((edge1 * d2[1] - edge2 * d1[1]) / det) if abs(det) > 1e-08 else unit(edge1)
        bi = unit((edge2 * d1[0] - edge1 * d2[0]) / det) if abs(det) > 1e-08 else unit(np.cross(n[0], ta))
        q1, q2 = (xy[i, 1] - xy[i, 0], xy[i, 2] - xy[i, 0])
        sd = q1[0] * q2[1] - q1[1] * q2[0]
        if abs(sd) > 1e-08:
            du = (d1 * q2[1] - d2 * q1[1]) / sd
            dv = (d2 * q1[0] - d1 * q2[0]) / sd
            footprint = 512 * max(np.linalg.norm(du), np.linalg.norm(dv))
            lod = int(np.clip(math.floor(math.log2(max(1, float(footprint)))), 0, 6))
        else:
            lod = 0
        depth[y, x] = zz
        P[y, x] = bc @ p
        N[y, x] = n
        UV[y, x] = uv
        M[y, x] = mesh['material'][i]
        C[y, x] = mesh['character_cloth'][i]
        T[y, x] = ta
        B[y, x] = bi
        LOD[y, x] = lod
    return {'P': P, 'N': N, 'T': T, 'B': B, 'UV': UV, 'M': M, 'C': C, 'LOD': LOD, 'depth': depth, 'view': view}

def shadow_map(mesh):
    S = 1024
    eye = np.array([-3, -4, 7], dtype=F)
    target = np.array([0, 0, 0.9], dtype=F)
    width = 7.8
    xy, z, forward, right, up = project(mesh['position'], eye, target, S, S, width)
    depth = np.full((S, S), -np.inf, dtype=F)
    for i in range(len(xy)):
        f = fragments(xy[i], z[i], S, S)
        if f is None:
            continue
        x, y, bc, zz = f
        depth[y, x] = np.maximum(depth[y, x], zz)
    return {'depth': depth, 'forward': forward, 'right': right, 'up': up, 'target': target, 'size': S, 'width': width}

def srgb_to_linear(a):
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4).astype(F)

def linear_to_srgb(a):
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * np.maximum(a, 0) ** (1 / 2.4) - 0.055)

def sample(a, uv):
    s = a.shape[0] - 1
    xx = np.clip(uv[:, 0] * s, 0, s)
    yy = np.clip((1 - uv[:, 1]) * s, 0, s)
    x = xx.astype(int)
    y = yy.astype(int)
    x1 = np.minimum(x + 1, s)
    y1 = np.minimum(y + 1, s)
    fx = xx - x
    fy = yy - y
    if a.ndim == 3:
        fx = fx[:, None]
        fy = fy[:, None]
    return ((a[y, x] * (1 - fx) + a[y, x1] * fx) * (1 - fy) + (a[y1, x] * (1 - fx) + a[y1, x1] * fx) * fy).astype(F)

def mip_sample(levels, uv, lod):
    out = np.empty((len(uv), 3), dtype=F) if levels[0].ndim == 3 else np.empty(len(uv), dtype=F)
    for level in np.unique(lod):
        mask = lod == level
        out[mask] = sample(levels[int(level)], uv[mask])
    return out

def ggx(A, N, L, V, rough, metal, radiance):
    H = unit(L + V)
    nl = np.maximum(N @ L, 0)
    nv = np.maximum(N @ V, 0.001)
    nh = np.maximum(N @ H, 0)
    vh = max(0.001, float(H @ V))
    alpha = np.maximum(rough, 0.08) ** 2
    a2 = alpha ** 2
    D = a2 / (math.pi * (nh ** 2 * (a2 - 1) + 1) ** 2 + 1e-07)
    k = (rough + 1) ** 2 / 8
    G = nl / (nl * (1 - k) + k + 1e-07) * (nv / (nv * (1 - k) + k))
    f0 = 0.04 * (1 - metal) + A * metal
    Fr = f0 + (1 - f0) * (1 - vh) ** 5
    spec = (D * G / (4 * nl * nv + 1e-06))[:, None] * Fr
    diffuse = (1 - Fr) * (1 - metal) * A / math.pi
    return (diffuse + spec) * nl[:, None] * radiance

def palette(illum, stops, colors, constant=False):
    if constant:
        idx = np.clip(np.searchsorted(stops, illum, side='right') - 1, 0, len(colors) - 1)
        return np.asarray(colors, dtype=F)[idx]
    return np.column_stack([np.interp(illum, stops, np.asarray(colors)[:, c]) for c in range(3)]).astype(F)
