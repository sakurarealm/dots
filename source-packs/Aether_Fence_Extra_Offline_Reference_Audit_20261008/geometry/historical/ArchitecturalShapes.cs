using Aether.Utilities;

namespace Aether.Voxel
{
    /// <summary>
    /// Material-independent, one-cell architectural models. Shared by chunk, volume and blueprint meshing.
    /// Geometry stays inside its cell so tint lookup, picking and the existing mesh collider agree.
    /// No GameObjects, materials or imported mesh allocations per block.
    /// </summary>
    public static class ArchitecturalShapes
    {
        public static bool Supports(int shape) => shape >= VoxShape.Pane && shape <= VoxShape.Window;

        public static void Put(VertexBuffer buffer, IVec3 position, Vox vox, Func<IVec3, Vox> neighbor,
            List<VoxelVolumeColliderBuilder.BoxSpec> collisionBoxes = null)
        {
            var model = new Model { buffer = buffer, position = position, vox = vox, collisionBoxes = collisionBoxes };
            switch (vox.shapeId)
            {
                case VoxShape.Pane:
                case VoxShape.Bars:
                    // Connections follow actual adjacent blocks, also across chunk boundaries.
                    // Four low metadata bits are not connection flags: player placement uses facing.
                    model.vox.metadata = 0;
                    bool south = Connects(neighbor(position + new IVec3(0, 0, 1)), vox);
                    bool west = Connects(neighbor(position + new IVec3(-1, 0, 0)), vox);
                    bool north = Connects(neighbor(position + new IVec3(0, 0, -1)), vox);
                    bool east = Connects(neighbor(position + new IVec3(1, 0, 0)), vox);
                    if (!(south || west || north || east))
                        south = west = north = east = true;
                    if (vox.shapeId == VoxShape.Pane)
                    {
                        // Remove internal joins: duplicate transparent faces turn seams dark.
                        model.Box(.4375f, 0, .4375f, .5625f, 1, .5625f,
                            (north ? 4 : 0) | (south ? 8 : 0) | (west ? 16 : 0) | (east ? 32 : 0));
                        if (south) model.Box(.4375f, 0, .5625f, .5625f, 1, 1, 4 |
                            (Connects(neighbor(position + new IVec3(0, 0, 1)), vox) ? 8 : 0));
                        if (north) model.Box(.4375f, 0, 0, .5625f, 1, .4375f, 8 |
                            (Connects(neighbor(position + new IVec3(0, 0, -1)), vox) ? 4 : 0));
                        if (east) model.Box(.5625f, 0, .4375f, 1, 1, .5625f, 16 |
                            (Connects(neighbor(position + new IVec3(1, 0, 0)), vox) ? 32 : 0));
                        if (west) model.Box(0, 0, .4375f, .4375f, 1, .5625f, 32 |
                            (Connects(neighbor(position + new IVec3(-1, 0, 0)), vox) ? 16 : 0));
                    }
                    else
                    {
                        model.Box(.46875f, 0, .46875f, .53125f, 1, .53125f);
                        for (int side = 0; side < 4; side++)
                        {
                            if (!(side == 0 ? south : side == 1 ? west : side == 2 ? north : east)) continue;
                            model.vox.Orientation = side;
                            model.Box(.46875f, .1875f, .53125f, .53125f, .25f, 1);
                            model.Box(.46875f, .75f, .53125f, .53125f, .8125f, 1);
                            model.Box(.46875f, 0, .71875f, .53125f, 1, .78125f);
                        }
                    }
                    break;
                case VoxShape.Ladder:
                    model.Box(.125f, 0, .875f, .25f, 1, 1);
                    model.Box(.75f, 0, .875f, .875f, 1, 1);
                    for (int i = 0; i < 4; i++)
                        model.Box(.25f, .0625f + i * .25f, .875f, .75f, .1875f + i * .25f, 1);
                    break;
                case VoxShape.Carpet:
                    model.Box(0, 0, 0, 1, .0625f, 1);
                    break;
                case VoxShape.Chain:
                    // Alternating closed rectangular links; axis is encoded in bits 4-5.
                    for (int i = 0; i < 3; i++)
                    {
                        float y = i / 3f;
                        if ((i & 1) == 0)
                        {
                            model.Box(.40625f, y, .46875f, .453125f, y + 1f / 3f, .53125f);
                            model.Box(.546875f, y, .46875f, .59375f, y + 1f / 3f, .53125f);
                            model.Box(.453125f, y, .46875f, .546875f, y + .046875f, .53125f);
                            model.Box(.453125f, y + 1f / 3f - .046875f, .46875f, .546875f, y + 1f / 3f, .53125f);
                        }
                        else
                        {
                            model.Box(.46875f, y, .40625f, .53125f, y + 1f / 3f, .453125f);
                            model.Box(.46875f, y, .546875f, .53125f, y + 1f / 3f, .59375f);
                            model.Box(.46875f, y, .453125f, .53125f, y + .046875f, .546875f);
                            model.Box(.46875f, y + 1f / 3f - .046875f, .453125f, .53125f, y + 1f / 3f, .546875f);
                        }
                    }
                    break;
                case VoxShape.Lattice:
                    // Horizontal hatch, or standing against the facing side when IsOpen.
                    model.Box(0, 0, 0, .125f, .125f, 1);
                    model.Box(.875f, 0, 0, 1, .125f, 1);
                    model.Box(.125f, 0, 0, .875f, .125f, .125f);
                    model.Box(.125f, 0, .875f, .875f, .125f, 1);
                    model.Box(.4375f, 0, .125f, .5625f, .125f, .875f);
                    model.Box(.125f, 0, .4375f, .4375f, .125f, .5625f);
                    model.Box(.5625f, 0, .4375f, .875f, .125f, .5625f);
                    break;
                case VoxShape.Panel:
                case VoxShape.Window:
                    // A thin full panel: doors, signs, shutters; any voxel material can be applied.
                    model.Box(0, 0, .875f, 1, 1, 1);
                    break;
                case VoxShape.FenceGate:
                    model.Box(0, 0, .4375f, .125f, 1, .5625f);
                    model.Box(.875f, 0, .4375f, 1, 1, .5625f);
                    if (vox.IsOpen)
                    {
                        model.Box(0, .25f, .5625f, .125f, .375f, 1);
                        model.Box(0, .6875f, .5625f, .125f, .8125f, 1);
                        model.Box(.875f, .25f, .5625f, 1, .375f, 1);
                        model.Box(.875f, .6875f, .5625f, 1, .8125f, 1);
                    }
                    else
                    {
                        model.Box(.125f, .25f, .4375f, .875f, .375f, .5625f);
                        model.Box(.125f, .6875f, .4375f, .875f, .8125f, .5625f);
                        model.Box(.4375f, .375f, .4375f, .5625f, .6875f, .5625f);
                    }
                    break;
            }
        }

        static bool Connects(Vox neighbor, Vox self) => !neighbor.IsTexNil() &&
            (neighbor.IsShapeCube || neighbor.shapeId == self.shapeId);

        struct Model
        {
            public VertexBuffer buffer;
            public IVec3 position;
            public Vox vox;
            public List<VoxelVolumeColliderBuilder.BoxSpec> collisionBoxes;

            Vector3 Transform(Vector3 point)
            {
                if (vox.shapeId == VoxShape.Chain)
                {
                    int axis = (vox.metadata >> 4) & 3;
                    if (axis == 1) point = new Vector3(point.y, 1 - point.x, point.z);
                    if (axis == 2) point = new Vector3(point.x, 1 - point.z, point.y);
                    return point;
                }
                if (vox.shapeId == VoxShape.Lattice)
                {
                    if (vox.IsOpen) point = new Vector3(point.x, point.z, 1 - point.y);
                    else if (vox.IsUp) point.y += .875f;
                }
                int facing = vox.Orientation;
                if ((vox.shapeId == VoxShape.Panel || vox.shapeId == VoxShape.Window) && vox.IsOpen)
                    facing = (facing + ((vox.metadata & 16) == 0 ? 1 : 3)) & 3;
                return facing switch
                {
                    Vox.OrientWest => new Vector3(1 - point.z, point.y, point.x),
                    Vox.OrientNorth => new Vector3(1 - point.x, point.y, 1 - point.z),
                    Vox.OrientEast => new Vector3(point.z, point.y, 1 - point.x),
                    _ => point
                };
            }

            public void Box(float x0, float y0, float z0, float x1, float y1, float z1, int hiddenFaces = 0)
            {
                if (collisionBoxes != null)
                {
                    var a = Transform(new Vector3(x0, y0, z0));
                    var b = Transform(new Vector3(x1, y1, z1));
                    collisionBoxes.Add(new VoxelVolumeColliderBuilder.BoxSpec
                    {
                        center = (a + b) * .5f + (Vector3)position,
                        size = Vector3.Max(a, b) - Vector3.Min(a, b)
                    });
                }
                if (buffer == null) return;
                if ((hiddenFaces & 1) == 0) Quad(new(x0, y1, z1), new(x1, y1, z1), new(x1, y1, z0), new(x0, y1, z0));
                if ((hiddenFaces & 2) == 0) Quad(new(x0, y0, z1), new(x0, y0, z0), new(x1, y0, z0), new(x1, y0, z1));
                if ((hiddenFaces & 4) == 0) Quad(new(x0, y0, z0), new(x0, y1, z0), new(x1, y1, z0), new(x1, y0, z0));
                if ((hiddenFaces & 8) == 0) Quad(new(x1, y0, z1), new(x1, y1, z1), new(x0, y1, z1), new(x0, y0, z1));
                if ((hiddenFaces & 16) == 0) Quad(new(x0, y0, z1), new(x0, y1, z1), new(x0, y1, z0), new(x0, y0, z0));
                if ((hiddenFaces & 32) == 0) Quad(new(x1, y0, z0), new(x1, y1, z0), new(x1, y1, z1), new(x1, y0, z1));
            }

            void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d)
            {
                a = Transform(a); b = Transform(b); c = Transform(c); d = Transform(d);
                var normal = Vector3.Cross(b - a, c - a).normalized;
                var uv = new Vector2(vox.texId, 0);
                Vector3 offset = position;
                buffer.PushVertex(a + offset, uv, normal);
                buffer.PushVertex(b + offset, uv, normal);
                buffer.PushVertex(c + offset, uv, normal);
                buffer.PushVertex(a + offset, uv, normal);
                buffer.PushVertex(c + offset, uv, normal);
                buffer.PushVertex(d + offset, uv, normal);
            }
        }
    }
}
