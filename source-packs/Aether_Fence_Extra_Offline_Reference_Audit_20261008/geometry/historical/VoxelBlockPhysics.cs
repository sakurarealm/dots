namespace Aether.Voxel
{
    /// <summary>Shared discrete collision model; keep openings and stair treads out of full-cell merging.</summary>
    public static class VoxelBlockPhysics
    {
        public static bool IsFull(Vox vox) => VoxelVolumeData.ParticipatesInPhysics(vox) &&
            (vox.IsShapeCube || vox.IsShapeIsosurface || vox.shapeId == VoxShape.Leaves);

        public static void Append(List<VoxelVolumeColliderBuilder.BoxSpec> boxes, IVec3 cell, Vox vox, Func<IVec3, Vox> neighbor)
        {
            if (ArchitecturalShapes.Supports(vox.shapeId))
            {
                ArchitecturalShapes.Put(null, cell, vox, neighbor, boxes);
                return;
            }
            void Box(Vector3 min, Vector3 max, bool rotate = true)
            {
                Vector3 Transform(Vector3 p)
                {
                    if (!rotate) return p;
                    if (vox.IsUp && (vox.IsShapeSlab || vox.IsShapeStair)) p.y = 1 - p.y;
                    return vox.Orientation switch
                    {
                        Vox.OrientWest => new Vector3(1 - p.z, p.y, p.x),
                        Vox.OrientNorth => new Vector3(1 - p.x, p.y, 1 - p.z),
                        Vox.OrientEast => new Vector3(p.z, p.y, 1 - p.x),
                        _ => p
                    };
                }
                var a = Transform(min); var b = Transform(max);
                boxes.Add(new VoxelVolumeColliderBuilder.BoxSpec
                { center = (Vector3)cell + (a + b) * .5f, size = Vector3.Max(a, b) - Vector3.Min(a, b) });
            }
            if (vox.IsShapeSlab) Box(Vector3.zero, new Vector3(1, .5f, 1));
            else if (vox.IsShapeStair)
            {
                Box(Vector3.zero, new Vector3(1, .5f, 1));
                Box(new Vector3(0, .5f, .5f), Vector3.one);
            }
            else if (vox.IsShapeTrapdoor)
            {
                if (vox.IsOpen) Box(new Vector3(0, 0, .8125f), Vector3.one);
                else Box(new Vector3(0, vox.IsUp ? .8125f : 0, 0), new Vector3(1, vox.IsUp ? 1 : .1875f, 1));
            }
            else
            {
                // Legacy decorative arbitrary meshes retain the pre-existing conservative box.
                Box(Vector3.zero, Vector3.one, false);
            }
        }
    }
}
