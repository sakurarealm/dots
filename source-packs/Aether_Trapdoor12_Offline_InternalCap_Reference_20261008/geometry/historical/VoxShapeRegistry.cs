using System;
using System.Collections.Generic;
using Sirenix.OdinInspector;
using UnityEngine;

namespace Aether
{
    [CreateAssetMenu(menuName = "Aether/Registry/VoxShapeRegistry")]
    public class VoxShapeRegistry : Registry<VoxShape>
    {
        public static VoxShapeRegistry instance;

        // VoxShape.Isosurface = 0
        void OnEnable() => baseId = 0;
    }

    [Serializable]
    public class VoxShape : RegistryEntry
    {
        public const int
            Isosurface = 0,
            Cube = 1,
            Slab = 2,
            Stair = 3,
            Wall = 4,
            Leaves = 5,
            Fence = 11,
            Trapdoor = 12,
            Slope = 13,
            Pane = 14,
            Bars = 15,
            Ladder = 16,
            Carpet = 17,
            Chain = 18,
            Lattice = 19,
            Panel = 20,
            FenceGate = 21,
            Window = 22,
            MAX = 22;

        [ReadOnly]
        public int id;
        
        public string name;
        
        public Mesh mesh;
        
        public Sprite icon;
        
        // Runtime Cached.
        [NonSerialized] public int[] meshTriangleIndices;
        [NonSerialized] public Vector3[] meshVertices;
        [NonSerialized] public Vector3[] meshNormals;

        public void InitMeshCache()
        {
            if (ArchitecturalShapes.Supports(id))
            {
                if (!mesh) mesh = ArchitecturalItems.Mesh(id);
                if (!icon) icon = ArchitecturalItems.Icon(id);
            }
            if (mesh == null)
                return;
            meshTriangleIndices = mesh.triangles;
            meshVertices = mesh.vertices;
            meshNormals = mesh.normals;
        }

        // public bool IsIso() => id == 0;
        // public bool IsFullCube() => id==1;  // means could Cull

        public int registryIndex { get => id; set  => id = value; }
        
        public string registryId { get => name; set => name = value; } 
    }
}
