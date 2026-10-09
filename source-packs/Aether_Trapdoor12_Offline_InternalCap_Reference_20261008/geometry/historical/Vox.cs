using System.Text;
using MessagePack;
using Sirenix.OdinInspector;
using Unity.Mathematics;
using Assert = UnityEngine.Assertions.Assert;

namespace Aether
{
    // global 
    using VoxTexId = System.UInt16;
    
    [MessagePackObject]
    public struct Vox
    {
        // 16bit
        [Key(0)]
        public VoxTexId texId;

        [Key(1)]
        public byte shapeId;

        [Key(2)]
        public byte metadata;
        
        // // 16bit [ShapeId:8, Data:8]
        // private UInt16 _internal_data;
        //
        // // [0, 255]
        // [ShowInInspector]
        // public int shapeId {
        //     get => (_internal_data >> 8) & 0xFF;
        //     set => _internal_data = (UInt16)(((value << 8) & 0xFF00) | (_internal_data & 0xFF));
        // }
        //
        // // [0, 255]
        // [ShowInInspector]
        // public byte metadata {
        //     get => (byte)(_internal_data & 0xFF);
        //     set => _internal_data = (UInt16)((_internal_data & 0xFF00) | (value & 0xFF));
        // }
        
        public bool IsTexNil() => texId <= 0;

        public static readonly Vox Nil = new();

        public static Vox of(VoxTexId texId, byte shapeId)
        {
            var vox = new Vox();
            vox.texId = texId;
            vox.shapeId = shapeId;
            return vox;
        }
        
        // public VoxLight light;

        // public float3 CachedFp;
        // public float3 CachedNorm;
        
        [IgnoreMember] public bool IsShapeIsosurface => shapeId == VoxShape.Isosurface;
        
        // WARNING: Only Valid if ShapeId==0 Isosurface.
        // SDF value for Isosurface Extraction. 0=surface, +positive=solid, -negative=void
        [ShowInInspector][IgnoreMember]
        public float Density {
            get {
                // don't Assert ShapeId here. Density-read should be safe. since Generating-Isosurface needs read every voxel's Density, and some IsIsoNil() check.
                // if (!IsShapeIsosurface) Debug.LogError($"Accessing Isosurface Density but ShapeId is not Isosurface ({shapeId})");
                return IsShapeIsosurface ? (metadata - 128) / 127.0f : 0; // (IsTexNil() ? -0.5f : 0.5f);
            }
            set {
                // Utility.Assert(value is >= -1.0f and <= 1.0f, () => $"Density outbound: {value}. should between [-1, 1]");
                if (value is < -1.0f or > 1.0f) {
                    // Debug.LogError($"Density outbound: {value}. should between [-1, 1]");
                    value = value.ClampNP1();
                }
                Assert.IsTrue(IsShapeIsosurface);
                // 四舍五入而非截断：截断会让每次回写（Smooth 迭代、重复挖掘）系统性向下偏最多 1/127，长期侵蚀密度场
                metadata = (byte)(value * 127.0f + 128.5f);
            }
        }
        
        [ShowInInspector][IgnoreMember]
        public float Density01 => IsShapeIsosurface ? metadata / 255.0f : 0;

        public bool IsDensityNil() => Density <= 0;

        
        [IgnoreMember] public bool IsShapeCube => shapeId == VoxShape.Cube;
    
    [IgnoreMember] public bool IsShapeStair => shapeId == VoxShape.Stair;
    [IgnoreMember] public bool IsShapeSlab => shapeId == VoxShape.Slab;
    [IgnoreMember] public bool IsShapeWall => shapeId == VoxShape.Wall;
    [IgnoreMember] public bool IsShapeFence => shapeId == VoxShape.Fence;
    [IgnoreMember] public bool IsShapeTrapdoor => shapeId == VoxShape.Trapdoor;
    [IgnoreMember] public bool IsShapeSlope => shapeId == VoxShape.Slope;

    /// <summary>MC 式栅栏横杆是否连到该邻居（栅栏 / 整砖 / 墙）。</summary>
    public bool ConnectsToFence() => !IsTexNil() && (IsShapeFence || IsShapeCube || IsShapeWall);

    // Metadata encoding for Stair/Slab/Wall/Trapdoor/Slope
    // Bit 0-1: Orientation (0=South, 1=West, 2=North, 3=East)
    // Bit 2: Up/Down state (0=Down, 1=Up) — Slab/Trapdoor 上下半；Wall 为水平偏移
    // Bit 3: Trapdoor open (0=Closed, 1=Open)
    
    [IgnoreMember]
    public int Orientation {
        get => metadata & 0x03;
        set => metadata = (byte)((metadata & 0xFC) | (value & 0x03));
    }
    
    [IgnoreMember]
    public bool IsUp {
        get => (metadata & 0x04) != 0;
        set => metadata = (byte)((metadata & 0xFB) | (value ? 0x04 : 0x00));
    }

    [IgnoreMember]
    public bool IsOpen {
        get => (metadata & 0x08) != 0;
        set => metadata = (byte)((metadata & 0xF7) | (value ? 0x08 : 0x00));
    }
    
    public const int
        OrientSouth = 0,
        OrientWest = 1,
        OrientNorth = 2,
        OrientEast = 3;

    // NOTE: 其实 ||IsDensityNil() 只是临时patch 理论上并不是必须的，因为严格意义上 TexId==0 那么Density就必然应该<=0.
    // public bool IsAir() => IsTexNil() || IsDensityNil();


        // public bool IsNil()
        // {
        //     return texId == 0;
        // }
        // public bool IsOpaque()
        // {
        //     return !IsNil();
        // }
        

        public override string ToString()
        {
            var sb = new StringBuilder();
            sb.Append("tex: ").Append(texId);
            if (!IsTexNil())
                sb.Append("(").Append(VoxTexRegistry.instance.At(texId).registryId).Append(")");
            sb.Append(", shape: ").Append(shapeId);
            if (IsShapeIsosurface)
                sb.Append($"(d: {Density:0.00})");
            sb.Append(", meta: ").Append(metadata);
            return sb.ToString();
        }
        
        public override int GetHashCode()
        {
            return texId ^ shapeId ^ metadata;
        }

        public static readonly int3 up = new(0, 1, 0);
    }

    public struct VoxLight
    {
        private UInt16 m_RGBS;
    }
}