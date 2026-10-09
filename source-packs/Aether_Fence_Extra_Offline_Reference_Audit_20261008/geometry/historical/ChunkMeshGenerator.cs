using System;
using Aether.Utilities;
using Unity.Collections;
using Unity.Collections.LowLevel.Unsafe;
using Unity.Jobs;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.Profiling;
using Vector3 = UnityEngine.Vector3;

namespace Aether.Voxel
{
public static class ChunkMeshGenerator
{
    public enum IsosurfaceMeshMode
    {
        SurfaceNets,
        MarchingCubes,
    }

    public static IsosurfaceMeshMode isosurfaceMeshMode = IsosurfaceMeshMode.SurfaceNets;

    /// <summary>Surface Nets 锋利度 [0,1]：0=完全平滑（纯梯度法线，跳过面法线处理），(0,1)=折痕插值，1=quad 级全 flat。</summary>
    public static float surfaceNetsSharpness;

    public static bool forceCubeShape;

    /// <summary>实验性微体素地表装饰；视觉验收前默认关闭，关闭时使用旧的交叉面片草。</summary>
    public static bool useMicroVoxelGroundCover;
    public static bool useMicroVoxelCanopies;
    public static float microVoxelDetailDensity = 1f;

    public static JobHandle ScheduleIsosurfaceJob(
        NativeArray<Vox> sampled,
        NativeList<float3> positions,
        NativeList<float2> uvs,
        NativeList<float3> normals,
        in int3 inner,
        int haloBorder,
        int meshStep,
        JobHandle dependsOn = default,
        int coarserNeighbors = 0, int finerNeighbors = 0, int3 sampleLatticeOrigin = default,
        int missingNeighbors = 0)
    {
        if (isosurfaceMeshMode == IsosurfaceMeshMode.MarchingCubes)
        {
            var job = new MarchingCubesJob();
            job.Setup(sampled, positions, uvs, normals, inner, haloBorder, meshStep);
            return job.Schedule(dependsOn);
        }

        var snJob = new SurfaceNetsJob();
        snJob.Setup(sampled, positions, uvs, normals, inner, haloBorder, meshStep, surfaceNetsSharpness);
        snJob.coarserNeighbors = coarserNeighbors;
        snJob.finerNeighbors = finerNeighbors;
        snJob.sampleLatticeOrigin = sampleLatticeOrigin;
        snJob.missingNeighbors = missingNeighbors;
        return snJob.Schedule(dependsOn);
    }

    public static int MissingTerrainNeighbors(Chunk chunk)
    {
        var owner = chunk.Owner;
        if (owner == null || !owner.isTerrain || !TerrainLodSystem.enableLod ||
            !owner.chunkGenerator || !owner.chunkGenerator.SupportsWorldSpaceSampling) return 0;
        int missing = 0;
        for (int i = 0; i < Chunk.NEIGHBORS.Length; i++)
        {
            if (chunk.GetNeighborChunk(i, out var neighbor) && neighbor.mapReady) continue;
            var d = Chunk.NEIGHBORS[i];
            missing |= 1 << (d.x + 1 + 3 * (d.y + 1) + 9 * (d.z + 1));
        }
        return missing;
    }

    // For Solid Blocks
    public static void GenerateMeshCubesAndShapes(VertexBuffer vbuf, Chunk chunk)
    {
        chunk.ForVoxels((vox, localpos) =>
        {
            if (vox.IsTexNil())
                return;

            if (VoxTexRegistry.IsTransparentTex(vox.texId))
                return;

            if (vox.IsShapeCube || (forceCubeShape && vox.IsShapeIsosurface))
            {
                PutCube(vbuf, localpos, vox, lp =>
                {
                    chunk.GetVoxel(lp, out var nv);
                    return nv;
                }, forceCubeShape);
            }
            else if (!vox.IsShapeIsosurface && vox.shapeId != VoxShape.Leaves)
            {
                PutShapeMesh(vbuf, localpos, vox, lp =>
                {
                    chunk.GetVoxel(lp, out var nv);
                    return nv;
                });
            }
        });
    }

/// <summary>该列没有地壳：整列悬空，或承重层正下方不是实地。</summary>
    const int NoCrustY = int.MinValue;

    /// <summary>
    /// 地形碰撞地壳。等值面只在密度符号变化处出三角形，地下虽然实心却没有碰撞面；
    /// 「顶层地形被建筑方块覆盖」这类改动一旦破开地表壳体，玩家就径直落进空洞坠亡。
    ///
    /// 按列取第一层承重体素，向下吃完整段连续实地（遇空腔/洞穴即止）补一个实心盒。顶面固定在
    /// 承重层底面，所以地表一被顶掉或挖掉地壳就跟着下移一格 —— 纵向可以一直挖，但每挖一格
    /// 底下永远还剩一层实心地板。吃完整段而非只补一格，是为了消掉相邻列之间的竖直缝隙：
    /// 盒高不增加三角形数，合并后与原地形实心区连成一体。
    ///
    /// 同 (顶,底) 的相邻格做二维贪心合并（先 X 后 Z）。只合并 X 的话，沿 X 起伏的坡面每行
    /// 都碎成 16 段、全块 256 个盒；补上 Z 才能收到十来个盒，finalize 的 6ms 预算才吃得下。
    /// 只进碰撞网格（无 MeshFilter），因此不参与渲染与染色，也不会与地表壳体共面 z-fighting。
    /// </summary>
    public static void GenerateTerrainCrust(VertexBuffer vbuf, Chunk chunk)
    {
        // 每格一段 [顶, 底]；tops[i] == NoCrustY 表示该格无地壳。
        Span<int> tops = stackalloc int[Chunk.LEN2];
        Span<int> bottoms = stackalloc int[Chunk.LEN2];
        for (int z = 0; z < Chunk.LEN; z++)
        for (int x = 0; x < Chunk.LEN; x++)
        {
            int i = x * Chunk.LEN + z;
            tops[i] = bottoms[i] = NoCrustY;
            if (TryGetCrustSpan(chunk, x, z, out int top, out int bottom))
            {
                tops[i] = top;
                bottoms[i] = bottom;
            }
        }

        // 每行一个 16 位掩码，记该行已被盒子占用的列；贪心扩张到 Z 时不能压到已占用的格。
        Span<uint> rowUsed = stackalloc uint[Chunk.LEN];
        rowUsed.Clear();

        for (int z = 0; z < Chunk.LEN; z++)
        for (int x = 0; x < Chunk.LEN; x++)
        {
            if ((rowUsed[z] & (1u << x)) != 0)
                continue;
            int top = tops[x * Chunk.LEN + z];
            if (top == NoCrustY)
                continue;
            int bottom = bottoms[x * Chunk.LEN + z];

            int x1 = x + 1;
            // 同行右侧可能已被更早那行扩张下来的盒子占住，必须一并停下，否则会重复覆盖。
            while (x1 < Chunk.LEN && (rowUsed[z] & (1u << x1)) == 0 &&
                   tops[x1 * Chunk.LEN + z] == top && bottoms[x1 * Chunk.LEN + z] == bottom)
                x1++;
            int z1 = z + 1;
            while (z1 < Chunk.LEN && CrustRowFree(rowUsed, tops, bottoms, z1, x, x1, top, bottom))
                z1++;

            uint span = (1u << (x1 - x)) - 1u;   // x1 - x 最大 16，1u<<16 仍在 uint 内
            for (int zz = z; zz < z1; zz++)
                rowUsed[zz] |= span << x;

            PutCrustBox(vbuf, new IVec3(x, bottom, z),
                Vector3.zero, new Vector3(x1 - x, top - bottom, z1 - z));
        }
    }

    /// <summary>立方体 8 角的三角索引（角号 = x|2y|4z，绕序与 <see cref="PutBox"/> 一致朝外）。</summary>
    static readonly int[] CrustBoxIndices = {
        6, 7, 3, 6, 3, 2,   // +Y
        4, 0, 1, 4, 1, 5,   // -Y
        0, 2, 3, 0, 3, 1,   // -Z
        5, 7, 6, 5, 6, 4,   // +Z
        4, 6, 2, 4, 2, 0,   // -X
        1, 3, 7, 1, 7, 5,   // +X
    };

    /// <summary>
    /// 地壳专用的索引化盒：8 顶点 + 36 索引，而非 <see cref="PutBox"/> 的每面 6 顶点共 36 顶点。
    /// 顶点 32B、索引 2B，同样 12 个三角形，网格数据从 1152B 降到 328B（3.5×）。
    /// 地壳只有一块碰撞网格、不参与渲染，UV/法线写占位值即可，PhysX 只读三角形。
    /// </summary>
    static void PutCrustBox(VertexBuffer vbuf, IVec3 localpos, Vector3 min, Vector3 max)
    {
        var verts = vbuf.Vertices;
        var indices = vbuf.Indices;
        int v = verts.Count;
        var origin = new Vector3(localpos.x, localpos.y, localpos.z);
        for (int i = 0; i < 8; i++)
            verts.Add(new VertexBuffer.Vertex
            {
                pos = origin + new Vector3(
                    (i & 1) != 0 ? max.x : min.x,
                    (i & 2) != 0 ? max.y : min.y,
                    (i & 4) != 0 ? max.z : min.z),
                norm = Vector3.up,
                uv = Vector2.zero,
            });
        for (int i = 0; i < CrustBoxIndices.Length; i++)
            indices.Add(v + CrustBoxIndices[i]);
    }

    /// <summary>行 z 的 [x0,x1) 是否整段未占用且与给定的 [顶,底] 完全一致（可继续向 Z 扩张）。</summary>
    static bool CrustRowFree(Span<uint> rowUsed, Span<int> tops, Span<int> bottoms,
        int z, int x0, int x1, int top, int bottom)
    {
        if ((rowUsed[z] & (((1u << (x1 - x0)) - 1u) << x0)) != 0)
            return false;
        for (int x = x0; x < x1; x++)
            if (tops[x * Chunk.LEN + z] != top || bottoms[x * Chunk.LEN + z] != bottom)
                return false;
        return true;
    }

/// <summary>
    /// 该列地壳跨度：<paramref name="top"/> = 最上面那格承重体素，
    /// <paramref name="bottom"/> = 其下连续实地的最底一格。盒体覆盖 [bottom, top]。
    /// </summary>
    static bool TryGetCrustSpan(Chunk chunk, int x, int z, out int top, out int bottom)
    {
        top = bottom = NoCrustY;
        // 体素内存布局是 XZY 且 Y 连续（见 Chunk.LocalIdx），所以整列就是一段连续下标。
        var voxels = chunk.nativeVoxels;
        int column = x << 8 | z << 4;
        for (int y = Chunk.LEN - 1; y >= 0; y--)
        {
            // 只认等值面实心格。满格方块由 GenerateMeshCubesAndShapes 出成实心盒、本身就带碰撞，
            // 计入地壳等于把已有碰撞再抄一份；MC 存档整块都是方块，计入会让它白付一份全量地壳。
            if (!IsCrustSolid(voxels[column + y]))
                continue;
            top = y;
            if (y == 0)
            {
                // 承重层正好压在 chunk 底面上，下一格在下方邻居 chunk 里。
                // 跨块补这一格不可省：本块没有更低的格子可取，而下方邻居的地壳按定义
                // 会排除它自己的最上层（那正是本格），于是「地表下方一层」会在每个 chunk
                // Y 边界处漏出一条 1 格高的缝 —— 正是这套地壳要消灭的那种穿地。
                if (!chunk.GetVoxel(new IVec3(x, -1, z), out var below) || !IsCrustSolid(below))
                    return false;
                bottom = -1;
                return true;
            }
            // 承重层正下方必须是等值面实心。悬空方块脚下是空气，不该凭空托起一块不存在的地；
            // 下方是满格方块则它自己就有碰撞，地壳不必重复补。
            if (!IsCrustSolid(voxels[column + y - 1]))
                return false;
            int lo = y - 1;
            while (lo > 0 && IsCrustSolid(voxels[column + lo - 1]))
                lo--;
            bottom = lo;
            return true;
        }
        return false;
    }

    /// <summary>
    /// 地壳只补「等值面实心」这一种格子 —— 它们在地下实心却一个碰撞面都没有，正是要补的对象。
    /// 判据与 <c>SurfaceNetsJob.SignChanged</c> 的实心判定严格一致（同为 <c>Density &gt; 0</c>），
    /// 两边对「哪里是实体」的理解不能有分叉，否则壳体与地壳之间会错位出一层缝。
    /// 半格/楼梯/栅栏/装饰件不承重；满格方块已自带碰撞，不重复计入。
    /// </summary>
    static bool IsCrustSolid(in Vox vox) => vox.IsShapeIsosurface && vox.Density > 0f;

    /// <summary>半透明体素（玻璃等）：独立透明 draw call，面剔除规则与实心方块一致。</summary>
    public static void GenerateMeshTransparent(VertexBuffer vbuf, Chunk chunk)
    {
        chunk.ForVoxels((vox, localpos) =>
        {
            if (vox.IsTexNil() || !VoxTexRegistry.IsTransparentTex(vox.texId))
                return;

            Func<IVec3, Vox> neighbor = lp =>
            {
                chunk.GetVoxel(lp, out var nv);
                return nv;
            };

            if (vox.IsShapeCube || (forceCubeShape && vox.IsShapeIsosurface))
            {
                PutCube(vbuf, localpos, vox, neighbor, forceCubeShape, OccludesTransparentFace);
            }
            else if (!vox.IsShapeIsosurface && vox.shapeId != VoxShape.Leaves)
            {
                PutShapeMesh(vbuf, localpos, vox, neighbor, OccludesTransparentFace, forceCubeShape);
            }
        });
    }

    /// <summary>
    /// 蓝图放置预览：与 chunk 网格流水线一致——<see cref="forceCubeShape"/> 关闭时先有 Surface Nets，
    /// 再叠立方体 / 异形块（跳过纯 isosurface，由 SN 覆盖）；开启时仅用块网格（isosurface 当整砖）。
    /// </summary>
    public static void AppendBlueprintPreviewGeometry(VertexBuffer vbuf, BlueprintData blueprint, HashSet<IVec3> excludeLocalCells = null) =>
        VoxelVolumeMeshBuilder.AppendGeometry(vbuf, blueprint, excludeLocalCells);

    /// <summary>与 chunk <see cref="PreSampleVoxels"/> 一致的 XZY padded 写入；核心区外已为 default（空气）。</summary>
    public static unsafe void PreSampleBlueprintPaddedGrid(BlueprintData blueprint, NativeArray<Vox> output)
    {
        using var data = new VoxelVolumeData();
        data.LoadFromBlueprint(blueprint, BlueprintOps.MaxEdge);
        data.PreSamplePaddedGrid(SurfaceNetsJob.BORDER, output);
    }

    public static unsafe void PreSampleVoxels(Chunk chunk, int border, NativeArray<Vox> output, int sLen)
    {
        int sLen2 = sLen * sLen;
        int voxSize = UnsafeUtility.SizeOf<Vox>();
        Vox* src = (Vox*)chunk.nativeVoxels.GetUnsafeReadOnlyPtr();
        Vox* dst = (Vox*)output.GetUnsafePtr();

        // Bulk copy: Y is contiguous in both chunk (XZY layout) and sampled array (XZY layout)
        for (int x = 0; x < Chunk.LEN; x++)
        for (int z = 0; z < Chunk.LEN; z++)
        {
            int srcIdx = x * Chunk.STRIDE_X + z * Chunk.STRIDE_Z;
            int dstIdx = (x + border) * sLen2 + (z + border) * sLen + border;
            UnsafeUtility.MemCpy(dst + dstIdx, src + srcIdx, Chunk.LEN * voxSize);
        }

        for (int x = -border; x < Chunk.LEN + border; x++)
        for (int z = -border; z < Chunk.LEN + border; z++)
        for (int y = -border; y < Chunk.LEN + border; y++)
        {
            if (x >= 0 && x < Chunk.LEN && z >= 0 && z < Chunk.LEN && y >= 0 && y < Chunk.LEN)
                continue;
            dst[(x + border) * sLen2 + (z + border) * sLen + (y + border)] =
                chunk.GetVoxelOr(new IVec3(x, y, z));
        }
    }

    public static void GenerateMeshFoliage(VertexBuffer vbuf, Chunk chunk)
    {
        chunk.ForVoxels((vox, lp) =>
        {
            // 陷入悖论了
            // TexId 本该是 only for Solid Tex 的，因为 Solid Tex 是一个单独的 Atlas, 单独的 DrawCall

            if (vox.IsTexNil())
                return;

            var shapeId = vox.shapeId;
            // Old saves also contain hanging grass as Leaves, independently of ground-cover generation.
            // Hide that legacy card in BK, while preserving other player-authored leaf blocks.
            if (shapeId == VoxShape.Leaves && (Aether.TerrainStyleManager.RealisticFloraEnabled ||
                VoxTexRegistry.tall_grass == null || vox.texId != VoxTexRegistry.tall_grass.texIndex))
                PutLeaves(vbuf, vox.texId, lp);

            // below is Decorative Foliage of some Isosurface Vox.
            if (vox.IsShapeIsosurface && vox.IsDensityNil())
                return;
            
            var texId = vox.texId;
            // 写实微体素地被（草叶/白花）只在写实风格生成；bk 等风格的地被由 bk GPU 植被承担，
            // 混生会出现赛璐璐世界里长写实草串的概率（TerrainStyleManager.RealisticFloraEnabled）
            if (IsGroundCoverTex(texId) && Aether.TerrainStyleManager.RealisticFloraEnabled) {
                var above = chunk.GetVoxelOr(lp + new IVec3(0, 1, 0));
                if (!above.IsTexNil() && above.shapeId != VoxShape.Leaves
                    && (!above.IsShapeIsosurface || !above.IsDensityNil()))
                    return;

                SN_FeaturePoint_Normal(chunk, lp, out var fp, out var normal, 1);
                if (!float.IsFinite(fp.x)) return;  // 孤立体素无符号变化，跳过
                // +0.5: SurfaceNetsJob 顶点也是 cellPos + fp + 0.5（密度采样在格中心），对齐地形网格表面
                var anchor = lp + fp + new Vector3(0.5f, 0.5f, 0.5f);
                var worldXZ = chunk.worldpos.xz() + lp.xz();
                if (useMicroVoxelGroundCover)
                    PutMicroVoxelGroundCover(vbuf, anchor, normal, worldXZ, chunk.BiomeAt(lp.xz()));
                else
                    PutGrass(vbuf, VoxTexRegistry.tall_grass.texIndex, anchor, normal, worldXZ);
            }
            // else if (texId == VoxTex.grass_moss.registryIndex)
            //     PutGrass(vbuf, VoxTex.tall_fern.registryIndex, lp);// + vox.CachedFp);
        });
    }



    #region Blocky Cube

    static float[] CUBE_POS = {
        0, 0, 1, 0, 1, 1, 0, 1, 0,  // Left -X
        0, 0, 1, 0, 1, 0, 0, 0, 0,
        1, 0, 0, 1, 1, 0, 1, 1, 1,  // Right +X
        1, 0, 0, 1, 1, 1, 1, 0, 1,
        0, 0, 1, 0, 0, 0, 1, 0, 0,  // Bottom -Y
        0, 0, 1, 1, 0, 0, 1, 0, 1,
        0, 1, 1, 1, 1, 1, 1, 1, 0,  // Bottom +Y
        0, 1, 1, 1, 1, 0, 0, 1, 0,
        0, 0, 0, 0, 1, 0, 1, 1, 0,  // Front -Z
        0, 0, 0, 1, 1, 0, 1, 0, 0,
        1, 0, 1, 1, 1, 1, 0, 1, 1,  // Back +Z
        1, 0, 1, 0, 1, 1, 0, 0, 1,
    };
    static float[] CUBE_UV = {
        1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0,  // One Face.
        1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0,
        1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0,
        1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0,
        1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0,
        1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0,
    };
    static float[] CUBE_NORM = {
        -1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0,
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1,
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1
    };

    static bool OccludesTransparentFace(Vox self, Vox neib, bool neighborTreatsIsoAsFullCube)
    {
        if (neib.IsTexNil())
            return false;

        if (neib.IsShapeIsosurface)
            return neighborTreatsIsoAsFullCube && !neib.IsDensityNil();

        if (neib.shapeId == VoxShape.Leaves)
            return false;

        // 玻璃贴玻璃：完整遮挡才剔除，避免接触面 alpha 叠两层在接缝处发黑。
        // 薄窗格不能遮掉旁边整块玻璃的整面，否则会留下可见空洞。
        if (VoxTexRegistry.IsTransparentTex(self.texId) && VoxTexRegistry.IsTransparentTex(neib.texId))
            return neib.IsShapeCube || neighborTreatsIsoAsFullCube;

        return neib.IsShapeCube || neighborTreatsIsoAsFullCube;
    }

    internal static void PutCube(VertexBuffer vbuf, IVec3 localpos, Vox vox, Func<IVec3, Vox> neighbor, bool neighborTreatsIsoAsFullCube,
        Func<Vox, Vox, bool, bool> occludesFace = null)
    {
        occludesFace ??= (self, neib, iso) => !neib.IsTexNil() && (neib.IsShapeCube || iso);

        for (int faceIdx = 0; faceIdx < 6; ++faceIdx)
        {
            IVec3 faceDir = Maths.AsVec3(CUBE_NORM, faceIdx * 18).RoundToInt();   // 18: 3 scalar * 3 vertex * 2 triangle

            Vox neibVox = neighbor(localpos + faceDir);
            if (occludesFace(vox, neibVox, neighborTreatsIsoAsFullCube))
                continue;

            for (int vertIdx = 0; vertIdx < 6; ++vertIdx)
            {
                vbuf.PushVertex(
                    Maths.AsVec3(CUBE_POS, faceIdx * 18 + vertIdx * 3) + localpos,
                    new(vox.texId, 0), //Maths.vec2(CUBE_UV,  faceIdx * 12 + vertIdx * 2),
                    Maths.AsVec3(CUBE_NORM, faceIdx * 18 + vertIdx * 3)
                );
            }
        }
    }

    internal static void PutShapeMesh(VertexBuffer vbuf, IVec3 localpos, Vox vox, Func<IVec3, Vox> neighbor,
        Func<Vox, Vox, bool, bool> occludesFace = null, bool neighborTreatsIsoAsFullCube = false)
    {
        if (ArchitecturalShapes.Supports(vox.shapeId)) {
            ArchitecturalShapes.Put(vbuf, localpos, vox, neighbor);
            return;
        }
        if (vox.IsShapeStair) {
            PutStair(vbuf, localpos, vox, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            return;
        }
        if (vox.IsShapeSlab) {
            PutSlab(vbuf, localpos, vox, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            return;
        }
        if (vox.IsShapeWall) {
            PutWall(vbuf, localpos, vox, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            return;
        }
        if (vox.IsShapeFence) {
            PutFence(vbuf, localpos, vox, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            return;
        }
        if (vox.IsShapeTrapdoor) {
            PutTrapdoor(vbuf, localpos, vox, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            return;
        }
        if (vox.IsShapeSlope) {
            PutSlope(vbuf, localpos, vox, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            return;
        }
        
        // Shape IDs are persisted in voxels; the registry's display order is not ID order.
        // In particular Sphere/Cone/Cylinder follow Fence/Trapdoor/Slope in the asset.
        // W20 直查：VoxShape.id 即 registryIndex（VoxShapeRegistry baseId=0），shapeId 字节就是列表
        // 下标——旧实现逐形状体素线性扫注册表。下标越界/空槽时回退线性扫保底（容错运行期注入的
        // 非连续条目）并保持原报错路径。
        var shapes = VoxShapeRegistry.instance?.entries;
        VoxShape shape = null;
        if (shapes != null && vox.shapeId < shapes.Count)
            shape = shapes[vox.shapeId];
        if (shape == null || shape.id != vox.shapeId)
        {
            if (shapes != null)
                foreach (var entry in shapes)
                    if (entry != null && entry.id == vox.shapeId) { shape = entry; break; }
        }
        if (shape?.mesh == null) {
            Debug.LogError($"No Shape Mesh @ ShapeId{vox.shapeId} of vox texId {vox.texId}");
            return;
        }
        // Blueprint/editor meshing can happen before ConstructionUI initializes its palette.
        if (shape.meshTriangleIndices == null)
            shape.InitMeshCache();
        if (shape.meshTriangleIndices == null) {
            Debug.LogError($"No Shape Mesh @ ShapeId{vox.shapeId} of vox texId {vox.texId}");
            return;
        }

        Vector3[] vertices = shape.meshVertices;
        Vector3[] normals = shape.meshNormals;
        int[] indices = shape.meshTriangleIndices;

        for (int triIdx = 0; triIdx < indices.Length; triIdx++) {
            int idx = indices[triIdx];
            vbuf.PushVertex(
                vertices[idx] + localpos + 0.5f*Vector3.one,
                new(vox.texId, 0),
                normals[idx]
            );
        }
    }

    static void PutBlockQuad(VertexBuffer vbuf, IVec3 localpos, Vox vox, Vector3 a, Vector3 b, Vector3 c, Vector3 d)
    {
        var offset = new Vector3(localpos.x, localpos.y, localpos.z);
        var normal = Vector3.Cross(b - a, c - a).normalized;
        var uv = new Vector2(vox.texId, 0);

        vbuf.PushVertex(a + offset, uv, normal);
        vbuf.PushVertex(b + offset, uv, normal);
        vbuf.PushVertex(c + offset, uv, normal);
        vbuf.PushVertex(a + offset, uv, normal);
        vbuf.PushVertex(c + offset, uv, normal);
        vbuf.PushVertex(d + offset, uv, normal);
    }

    static void PutBlockTri(VertexBuffer vbuf, IVec3 localpos, Vox vox, Vector3 a, Vector3 b, Vector3 c)
    {
        var offset = new Vector3(localpos.x, localpos.y, localpos.z);
        var normal = Vector3.Cross(b - a, c - a).normalized;
        var uv = new Vector2(vox.texId, 0);

        vbuf.PushVertex(a + offset, uv, normal);
        vbuf.PushVertex(b + offset, uv, normal);
        vbuf.PushVertex(c + offset, uv, normal);
    }

    static void PutBox(VertexBuffer vbuf, IVec3 localpos, Vox vox, Vector3 min, Vector3 max)
    {
        if (max.x <= min.x || max.y <= min.y || max.z <= min.z)
            return;

        PutBlockQuad(vbuf, localpos, vox,
            new(min.x, max.y, max.z),
            new(max.x, max.y, max.z),
            new(max.x, max.y, min.z),
            new(min.x, max.y, min.z));

        PutBlockQuad(vbuf, localpos, vox,
            new(min.x, min.y, max.z),
            new(min.x, min.y, min.z),
            new(max.x, min.y, min.z),
            new(max.x, min.y, max.z));

        PutBlockQuad(vbuf, localpos, vox,
            new(min.x, min.y, min.z),
            new(min.x, max.y, min.z),
            new(max.x, max.y, min.z),
            new(max.x, min.y, min.z));

        PutBlockQuad(vbuf, localpos, vox,
            new(max.x, min.y, max.z),
            new(max.x, max.y, max.z),
            new(min.x, max.y, max.z),
            new(min.x, min.y, max.z));

        PutBlockQuad(vbuf, localpos, vox,
            new(min.x, min.y, max.z),
            new(min.x, max.y, max.z),
            new(min.x, max.y, min.z),
            new(min.x, min.y, min.z));

        PutBlockQuad(vbuf, localpos, vox,
            new(max.x, min.y, min.z),
            new(max.x, max.y, min.z),
            new(max.x, max.y, max.z),
            new(max.x, min.y, max.z));
    }

    static void PutBoxCulled(VertexBuffer vbuf, IVec3 localpos, Vox vox, Vector3 min, Vector3 max,
        Func<IVec3, Vox> neighbor, Func<Vox, Vox, bool, bool> occludesFace, bool neighborTreatsIsoAsFullCube)
    {
        if (max.x <= min.x || max.y <= min.y || max.z <= min.z)
            return;

        if (!occludesFace(vox, neighbor(localpos + new IVec3(0, 1, 0)), neighborTreatsIsoAsFullCube))
            PutBlockQuad(vbuf, localpos, vox,
                new(min.x, max.y, max.z), new(max.x, max.y, max.z), new(max.x, max.y, min.z), new(min.x, max.y, min.z));

        if (!occludesFace(vox, neighbor(localpos + new IVec3(0, -1, 0)), neighborTreatsIsoAsFullCube))
            PutBlockQuad(vbuf, localpos, vox,
                new(min.x, min.y, max.z), new(min.x, min.y, min.z), new(max.x, min.y, min.z), new(max.x, min.y, max.z));

        if (!occludesFace(vox, neighbor(localpos + new IVec3(0, 0, -1)), neighborTreatsIsoAsFullCube))
            PutBlockQuad(vbuf, localpos, vox,
                new(min.x, min.y, min.z), new(min.x, max.y, min.z), new(max.x, max.y, min.z), new(max.x, min.y, min.z));

        if (!occludesFace(vox, neighbor(localpos + new IVec3(0, 0, 1)), neighborTreatsIsoAsFullCube))
            PutBlockQuad(vbuf, localpos, vox,
                new(max.x, min.y, max.z), new(max.x, max.y, max.z), new(min.x, max.y, max.z), new(min.x, min.y, max.z));

        if (!occludesFace(vox, neighbor(localpos + new IVec3(-1, 0, 0)), neighborTreatsIsoAsFullCube))
            PutBlockQuad(vbuf, localpos, vox,
                new(min.x, min.y, max.z), new(min.x, max.y, max.z), new(min.x, max.y, min.z), new(min.x, min.y, min.z));

        if (!occludesFace(vox, neighbor(localpos + new IVec3(1, 0, 0)), neighborTreatsIsoAsFullCube))
            PutBlockQuad(vbuf, localpos, vox,
                new(max.x, min.y, min.z), new(max.x, max.y, min.z), new(max.x, max.y, max.z), new(max.x, min.y, max.z));
    }

    static void PutSolidBox(VertexBuffer vbuf, IVec3 localpos, Vox vox, Vector3 min, Vector3 max,
        Func<IVec3, Vox> neighbor, Func<Vox, Vox, bool, bool> occludesFace, bool neighborTreatsIsoAsFullCube)
    {
        if (occludesFace != null && neighbor != null)
            PutBoxCulled(vbuf, localpos, vox, min, max, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        else
            PutBox(vbuf, localpos, vox, min, max);
    }
    
    /// <summary>Minecraft 楼梯 shape：由邻接楼梯在网格阶段推导，不写入 metadata。</summary>
    enum StairCornerShape : byte
    {
        Straight,
        InnerLeft,
        InnerRight,
        OuterLeft,
        OuterRight,
    }

    static IVec3 StairOrientDir(int orient) => orient switch
    {
        Vox.OrientWest => new IVec3(-1, 0, 0),
        Vox.OrientNorth => new IVec3(0, 0, -1),
        Vox.OrientEast => new IVec3(1, 0, 0),
        _ => new IVec3(0, 0, 1), // South = +Z
    };

    static int StairOrientOpposite(int orient) => orient switch
    {
        Vox.OrientSouth => Vox.OrientNorth,
        Vox.OrientNorth => Vox.OrientSouth,
        Vox.OrientWest => Vox.OrientEast,
        Vox.OrientEast => Vox.OrientWest,
        _ => orient,
    };

    /// <summary>俯视 +Y：逆时针（MC counterClockWise）。</summary>
    static int StairOrientCcw(int orient) => orient switch
    {
        Vox.OrientSouth => Vox.OrientEast,
        Vox.OrientEast => Vox.OrientNorth,
        Vox.OrientNorth => Vox.OrientWest,
        Vox.OrientWest => Vox.OrientSouth,
        _ => orient,
    };

    /// <summary>俯视 +Y：顺时针（MC clockWise）。</summary>
    static int StairOrientCw(int orient) => orient switch
    {
        Vox.OrientSouth => Vox.OrientWest,
        Vox.OrientWest => Vox.OrientNorth,
        Vox.OrientNorth => Vox.OrientEast,
        Vox.OrientEast => Vox.OrientSouth,
        _ => orient,
    };

    /// <summary>South/North 同 Z 轴，West/East 同 X 轴（编码偶/奇一致）。</summary>
    static bool StairSameAxis(int a, int b) => (a & 1) == (b & 1);

    static bool StairCanTakeShape(Vox self, Func<IVec3, Vox> neighbor, IVec3 localpos, int checkOrient)
    {
        var n = neighbor(localpos + StairOrientDir(checkOrient));
        return !n.IsShapeStair || n.Orientation != self.Orientation || n.IsUp != self.IsUp;
    }

    /// <summary>
    /// 半砖侧邻接 → inner（L），高台阶侧邻接 → outer（1/4）。
    /// canTakeShape 的探测方向跟「邻居在哪一侧」走（与 MC 源码一致），不跟 inner/outer 名字走；
    /// 否则侧面再续一段同朝向楼梯时会把拐角误打回 straight。
    /// </summary>
    static StairCornerShape ResolveStairCornerShape(Vox vox, IVec3 localpos, Func<IVec3, Vox> neighbor)
    {
        if (neighbor == null)
            return StairCornerShape.Straight;

        int facing = vox.Orientation;

        // 半砖侧（facing 反方向）→ inner；探测方向 = 邻居朝向本身（MC 对 opposite 侧邻居的规则）
        var lowSide = neighbor(localpos + StairOrientDir(StairOrientOpposite(facing)));
        if (lowSide.IsShapeStair && lowSide.IsUp == vox.IsUp)
        {
            int nf = lowSide.Orientation;
            if (!StairSameAxis(facing, nf) && StairCanTakeShape(vox, neighbor, localpos, nf))
            {
                if (nf == StairOrientCcw(facing))
                    return StairCornerShape.InnerLeft;
                if (nf == StairOrientCw(facing))
                    return StairCornerShape.InnerRight;
            }
        }

        // 高台阶侧（facing）→ outer；探测方向 = 邻居朝向的反方向（MC 对 facing 侧邻居的规则）
        var highSide = neighbor(localpos + StairOrientDir(facing));
        if (highSide.IsShapeStair && highSide.IsUp == vox.IsUp)
        {
            int nf = highSide.Orientation;
            if (!StairSameAxis(facing, nf) && StairCanTakeShape(vox, neighbor, localpos, StairOrientOpposite(nf)))
            {
                if (nf == StairOrientCcw(facing))
                    return StairCornerShape.OuterLeft;
                if (nf == StairOrientCw(facing))
                    return StairCornerShape.OuterRight;
            }
        }

        return StairCornerShape.Straight;
    }

    /// <summary>朝向一侧的半格范围（另一轴仍为 0..1）。</summary>
    static void StairHalfRange(int orient, out float x0, out float x1, out float z0, out float z1)
    {
        x0 = 0f; x1 = 1f; z0 = 0f; z1 = 1f;
        switch (orient)
        {
            case Vox.OrientSouth: z0 = 0.5f; break;
            case Vox.OrientNorth: z1 = 0.5f; break;
            case Vox.OrientWest:  x1 = 0.5f; break;
            case Vox.OrientEast:  x0 = 0.5f; break;
        }
    }

    static void StairIntersectHalves(int a, int b, float y0, float y1, out Vector3 min, out Vector3 max)
    {
        StairHalfRange(a, out float ax0, out float ax1, out float az0, out float az1);
        StairHalfRange(b, out float bx0, out float bx1, out float bz0, out float bz1);
        min = new Vector3(Mathf.Max(ax0, bx0), y0, Mathf.Max(az0, bz0));
        max = new Vector3(Mathf.Min(ax1, bx1), y1, Mathf.Min(az1, bz1));
    }

    static void PutStair(VertexBuffer vbuf, IVec3 localpos, Vox vox,
        Func<IVec3, Vox> neighbor = null, Func<Vox, Vox, bool, bool> occludesFace = null, bool neighborTreatsIsoAsFullCube = false)
    {
        int orient = vox.Orientation;
        bool isUp = vox.IsUp;
        float stepY0 = isUp ? 0f : 0.5f;
        float stepY1 = isUp ? 0.5f : 1f;

        PutSolidBox(vbuf, localpos, vox,
            new(0f, isUp ? 0.5f : 0f, 0f),
            new(1f, isUp ? 1f : 0.5f, 1f),
            neighbor, occludesFace, neighborTreatsIsoAsFullCube);

        var corner = ResolveStairCornerShape(vox, localpos, neighbor);

        void PutStepHalf(int halfOrient)
        {
            StairHalfRange(halfOrient, out float x0, out float x1, out float z0, out float z1);
            PutSolidBox(vbuf, localpos, vox, new(x0, stepY0, z0), new(x1, stepY1, z1),
                neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        }

        void PutStepQuarter(int backOrient, int sideOrient)
        {
            StairIntersectHalves(backOrient, sideOrient, stepY0, stepY1, out var min, out var max);
            PutSolidBox(vbuf, localpos, vox, min, max, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        }

        switch (corner)
        {
            case StairCornerShape.OuterLeft:
                PutStepQuarter(orient, StairOrientCcw(orient));
                break;
            case StairCornerShape.OuterRight:
                PutStepQuarter(orient, StairOrientCw(orient));
                break;
            case StairCornerShape.InnerLeft:
                PutStepHalf(orient);
                PutStepQuarter(StairOrientOpposite(orient), StairOrientCcw(orient));
                break;
            case StairCornerShape.InnerRight:
                PutStepHalf(orient);
                PutStepQuarter(StairOrientOpposite(orient), StairOrientCw(orient));
                break;
            default:
                PutStepHalf(orient);
                break;
        }
    }
    
    static void PutSlab(VertexBuffer vbuf, IVec3 localpos, Vox vox,
        Func<IVec3, Vox> neighbor = null, Func<Vox, Vox, bool, bool> occludesFace = null, bool neighborTreatsIsoAsFullCube = false)
    {
        bool isUp = vox.IsUp;
        PutSolidBox(vbuf, localpos, vox,
            new(0f, isUp ? 0.5f : 0f, 0f),
            new(1f, isUp ? 1f : 0.5f, 1f),
            neighbor, occludesFace, neighborTreatsIsoAsFullCube);
    }
    
    static void PutWall(VertexBuffer vbuf, IVec3 localpos, Vox vox,
        Func<IVec3, Vox> neighbor = null, Func<Vox, Vox, bool, bool> occludesFace = null, bool neighborTreatsIsoAsFullCube = false)
    {
        int orient = vox.Orientation;
        bool isOffset = vox.IsUp;
        
        float x0 = 0.25f, x1 = 0.75f;
        float z0 = 0.25f, z1 = 0.75f;
        
        if (orient == Vox.OrientSouth || orient == Vox.OrientNorth) {
            x0 = 0f; x1 = 1f;
            z0 = 0.25f; z1 = 0.75f;
            if (isOffset) {
                z0 = 0f; z1 = 0.5f;
            }
        }
        else {
            z0 = 0f; z1 = 1f;
            x0 = 0.25f; x1 = 0.75f;
            if (isOffset) {
                x0 = 0.5f; x1 = 1f;
            }
        }

        PutSolidBox(vbuf, localpos, vox, new(x0, 0f, z0), new(x1, 1f, z1), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
    }

    /// <summary>45° 斜面：高边沿朝向的反方向，低边在玩家面朝方向；IsUp 垂直翻转（顶面放置）。</summary>
    static void PutSlope(VertexBuffer vbuf, IVec3 localpos, Vox vox,
        Func<IVec3, Vox> neighbor = null, Func<Vox, Vox, bool, bool> occludesFace = null, bool neighborTreatsIsoAsFullCube = false)
    {
        int orient = vox.Orientation;
        bool flipY = vox.IsUp;

        Vector3 V(float x, float y, float z) => flipY ? new Vector3(x, 1f - y, z) : new Vector3(x, y, z);

        void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d)
        {
            a = V(a.x, a.y, a.z);
            b = V(b.x, b.y, b.z);
            c = V(c.x, c.y, c.z);
            d = V(d.x, d.y, d.z);
            if (flipY)
                PutBlockQuad(vbuf, localpos, vox, a, d, c, b);
            else
                PutBlockQuad(vbuf, localpos, vox, a, b, c, d);
        }

        void Tri(Vector3 a, Vector3 b, Vector3 c)
        {
            a = V(a.x, a.y, a.z);
            b = V(b.x, b.y, b.z);
            c = V(c.x, c.y, c.z);
            if (flipY)
                PutBlockTri(vbuf, localpos, vox, a, c, b);
            else
                PutBlockTri(vbuf, localpos, vox, a, b, c);
        }

        bool FaceOpen(Func<IVec3, Vox> n, IVec3 dir) =>
            occludesFace == null || n == null || !occludesFace(vox, n(localpos + dir), neighborTreatsIsoAsFullCube);

        switch (orient)
        {
            case Vox.OrientSouth:
                if (FaceOpen(neighbor, new IVec3(0, -1, 0)))
                    Quad(new(0, 0, 0), new(1, 0, 0), new(1, 0, 1), new(0, 0, 1));
                if (FaceOpen(neighbor, new IVec3(0, 0, -1)))
                    Quad(new(0, 0, 0), new(0, 1, 0), new(1, 1, 0), new(1, 0, 0));
                if (FaceOpen(neighbor, new IVec3(-1, 0, 0)))
                    Tri(new(0, 0, 0), new(0, 0, 1), new(0, 1, 0));
                if (FaceOpen(neighbor, new IVec3(1, 0, 0)))
                    Tri(new(1, 0, 0), new(1, 1, 0), new(1, 0, 1));
                Quad(new(0, 1, 0), new(0, 0, 1), new(1, 0, 1), new(1, 1, 0));
                break;
            case Vox.OrientNorth:
                if (FaceOpen(neighbor, new IVec3(0, -1, 0)))
                    Quad(new(0, 0, 0), new(1, 0, 0), new(1, 0, 1), new(0, 0, 1));
                if (FaceOpen(neighbor, new IVec3(0, 0, 1)))
                    Quad(new(1, 0, 1), new(1, 1, 1), new(0, 1, 1), new(0, 0, 1));
                if (FaceOpen(neighbor, new IVec3(-1, 0, 0)))
                    Tri(new(0, 0, 0), new(0, 0, 1), new(0, 1, 1));
                if (FaceOpen(neighbor, new IVec3(1, 0, 0)))
                    Tri(new(1, 0, 0), new(1, 1, 1), new(1, 0, 1));
                Quad(new(1, 0, 0), new(0, 0, 0), new(0, 1, 1), new(1, 1, 1));
                break;
            case Vox.OrientWest:
                if (FaceOpen(neighbor, new IVec3(0, -1, 0)))
                    Quad(new(0, 0, 0), new(1, 0, 0), new(1, 0, 1), new(0, 0, 1));
                if (FaceOpen(neighbor, new IVec3(1, 0, 0)))
                    Quad(new(1, 0, 0), new(1, 1, 0), new(1, 1, 1), new(1, 0, 1));
                if (FaceOpen(neighbor, new IVec3(0, 0, -1)))
                    Tri(new(0, 0, 0), new(1, 1, 0), new(1, 0, 0));
                if (FaceOpen(neighbor, new IVec3(0, 0, 1)))
                    Tri(new(0, 0, 1), new(1, 0, 1), new(1, 1, 1));
                Quad(new(0, 0, 0), new(0, 0, 1), new(1, 1, 1), new(1, 1, 0));
                break;
            case Vox.OrientEast:
                if (FaceOpen(neighbor, new IVec3(0, -1, 0)))
                    Quad(new(0, 0, 0), new(1, 0, 0), new(1, 0, 1), new(0, 0, 1));
                if (FaceOpen(neighbor, new IVec3(-1, 0, 0)))
                    Quad(new(0, 0, 1), new(0, 1, 1), new(0, 1, 0), new(0, 0, 0));
                if (FaceOpen(neighbor, new IVec3(0, 0, -1)))
                    Tri(new(0, 0, 0), new(0, 1, 0), new(1, 0, 0));
                if (FaceOpen(neighbor, new IVec3(0, 0, 1)))
                    Tri(new(0, 0, 1), new(1, 0, 1), new(0, 1, 1));
                Quad(new(1, 0, 0), new(0, 1, 0), new(0, 1, 1), new(1, 0, 1));
                break;
        }
    }

    static void PutFence(VertexBuffer vbuf, IVec3 localpos, Vox vox, Func<IVec3, Vox> neighbor,
        Func<Vox, Vox, bool, bool> occludesFace = null, bool neighborTreatsIsoAsFullCube = false)
    {
        const float postMin = 0.375f;
        const float postMax = 0.625f;
        const float barMin = 0.4375f;
        const float barMax = 0.5625f;
        const float barLowY0 = 0.375f;
        const float barLowY1 = 0.625f;
        const float barHighY0 = 0.75f;
        const float barHighY1 = 1f;

        PutSolidBox(vbuf, localpos, vox, new(postMin, 0f, postMin), new(postMax, 1f, postMax), neighbor, occludesFace, neighborTreatsIsoAsFullCube);

        if (neighbor(localpos + new IVec3(1, 0, 0)).ConnectsToFence())
        {
            PutSolidBox(vbuf, localpos, vox, new(0.5f, barLowY0, barMin), new(1f, barLowY1, barMax), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            PutSolidBox(vbuf, localpos, vox, new(0.5f, barHighY0, barMin), new(1f, barHighY1, barMax), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        }
        if (neighbor(localpos + new IVec3(-1, 0, 0)).ConnectsToFence())
        {
            PutSolidBox(vbuf, localpos, vox, new(0f, barLowY0, barMin), new(0.5f, barLowY1, barMax), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            PutSolidBox(vbuf, localpos, vox, new(0f, barHighY0, barMin), new(0.5f, barHighY1, barMax), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        }
        if (neighbor(localpos + new IVec3(0, 0, 1)).ConnectsToFence())
        {
            PutSolidBox(vbuf, localpos, vox, new(barMin, barLowY0, 0.5f), new(barMax, barLowY1, 1f), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            PutSolidBox(vbuf, localpos, vox, new(barMin, barHighY0, 0.5f), new(barMax, barHighY1, 1f), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        }
        if (neighbor(localpos + new IVec3(0, 0, -1)).ConnectsToFence())
        {
            PutSolidBox(vbuf, localpos, vox, new(barMin, barLowY0, 0f), new(barMax, barLowY1, 0.5f), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            PutSolidBox(vbuf, localpos, vox, new(barMin, barHighY0, 0f), new(barMax, barHighY1, 0.5f), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        }
    }

    static void PutTrapdoor(VertexBuffer vbuf, IVec3 localpos, Vox vox,
        Func<IVec3, Vox> neighbor = null, Func<Vox, Vox, bool, bool> occludesFace = null, bool neighborTreatsIsoAsFullCube = false)
    {
        const float t = 0.1875f;
        int orient = vox.Orientation;

        if (!vox.IsOpen)
        {
            if (vox.IsUp)
                PutTrapdoorFaceXZ(vbuf, localpos, vox, 1f - t, 1f, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            else
                PutTrapdoorFaceXZ(vbuf, localpos, vox, 0f, t, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
            return;
        }

        // 与楼梯约定一致：South=+Z、North=−Z、East=+X、West=−X（开时薄板贴在该朝向一侧）
        switch (orient)
        {
            case Vox.OrientSouth:
                PutTrapdoorFaceXY(vbuf, localpos, vox, 1f - t, 1f, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
                break;
            case Vox.OrientNorth:
                PutTrapdoorFaceXY(vbuf, localpos, vox, 0f, t, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
                break;
            case Vox.OrientWest:
                PutTrapdoorFaceYZ(vbuf, localpos, vox, 0f, t, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
                break;
            case Vox.OrientEast:
                PutTrapdoorFaceYZ(vbuf, localpos, vox, 1f - t, 1f, neighbor, occludesFace, neighborTreatsIsoAsFullCube);
                break;
        }
    }

    // MC 活板门：2/16 外框 + 十字档，中间 2×2 共四洞（5/16 每洞）
    static void PutTrapdoorFaceXZ(VertexBuffer vbuf, IVec3 localpos, Vox vox, float y0, float y1,
        Func<IVec3, Vox> neighbor, Func<Vox, Vox, bool, bool> occludesFace, bool neighborTreatsIsoAsFullCube)
    {
        const float e = 0.125f;
        const float m0 = 0.4375f;
        const float m1 = 0.5625f;

        PutSolidBox(vbuf, localpos, vox, new(0f, y0, 0f), new(1f, y1, e), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(0f, y0, 1f - e), new(1f, y1, 1f), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(0f, y0, e), new(e, y1, 1f - e), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(1f - e, y0, e), new(1f, y1, 1f - e), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(e, y0, m0), new(1f - e, y1, m1), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(m0, y0, e), new(m1, y1, 1f - e), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
    }

    static void PutTrapdoorFaceXY(VertexBuffer vbuf, IVec3 localpos, Vox vox, float z0, float z1,
        Func<IVec3, Vox> neighbor, Func<Vox, Vox, bool, bool> occludesFace, bool neighborTreatsIsoAsFullCube)
    {
        const float e = 0.125f;
        const float m0 = 0.4375f;
        const float m1 = 0.5625f;

        PutSolidBox(vbuf, localpos, vox, new(0f, 0f, z0), new(1f, e, z1), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(0f, 1f - e, z0), new(1f, 1f, z1), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(0f, e, z0), new(e, 1f - e, z1), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(1f - e, e, z0), new(1f, 1f - e, z1), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(e, m0, z0), new(1f - e, m1, z1), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(m0, e, z0), new(m1, 1f - e, z1), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
    }

    static void PutTrapdoorFaceYZ(VertexBuffer vbuf, IVec3 localpos, Vox vox, float x0, float x1,
        Func<IVec3, Vox> neighbor, Func<Vox, Vox, bool, bool> occludesFace, bool neighborTreatsIsoAsFullCube)
    {
        const float e = 0.125f;
        const float m0 = 0.4375f;
        const float m1 = 0.5625f;

        PutSolidBox(vbuf, localpos, vox, new(x0, 0f, 0f), new(x1, e, 1f), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(x0, 1f - e, 0f), new(x1, 1f, 1f), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(x0, e, 0f), new(x1, 1f - e, e), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(x0, e, 1f - e), new(x1, 1f - e, 1f), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(x0, m0, e), new(x1, m1, 1f - e), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
        PutSolidBox(vbuf, localpos, vox, new(x0, e, m0), new(x1, 1f - e, m1), neighbor, occludesFace, neighborTreatsIsoAsFullCube);
    }




    #endregion


    #region Misc, Foliages

    static bool IsGroundCoverTex(UInt16 texId) =>
        VoxTexRegistry.IsGroundCover(texId);   // 写实三件套 + groundCover 标记的风格包草类（bk_grass 等，见 VoxTexRegistry.Init）

    /// <summary>
    /// P0 微体素生态装饰：低频场负责成片分布，高频场打散边缘；形体直接并入 chunk 的 foliage mesh，
    /// 不产生 GameObject、额外材质或额外 draw call。worldXZ hash 保证重载与跨 chunk 边界稳定。
    /// </summary>
    static void PutMicroVoxelGroundCover(VertexBuffer vbuf, Vector3 pos, Vector3 surfaceNormal, Vector2Int worldXZ, Biome biome)
    {
        var biomeDensity = biome?.registryId switch
        {
            "forest" => 1.15f,
            "plains" => 0.9f,
            "taiga" => 0.72f,
            "mountains" => 0.36f,
            "coastal_cliffs" => 0.24f,
            "beach" => 0.08f,
            "desert" or "deep_ocean" or "cold_ocean" => 0f,
            _ => 0.65f,
        };
        if (biomeDensity <= 0f || surfaceNormal.y < 0.58f)
            return;

        var density = Mathf.Clamp(microVoxelDetailDensity, 0.5f, 2f);
        if (useMicroVoxelCanopies && biome?.registryId == "forest" && surfaceNormal.y > 0.78f
            && worldXZ.hash(739) < 0.0065f * density)
        {
            PutMicroTree(vbuf, pos - surfaceNormal * 0.06f, surfaceNormal, worldXZ);
            return;
        }

        var ecology = EcologyField(worldXZ, 10, 701) * 0.72f + EcologyField(worldXZ, 4, 702) * 0.28f;
        var slope = Mathf.InverseLerp(0.58f, 0.9f, surfaceNormal.y);
        if (ecology * Mathf.Lerp(0.45f, 1f, slope) < 0.72f - biomeDensity * 0.1f - (density - 1f) * 0.08f)
            return;

        var yaw = worldXZ.hash(703) * 360f;
        var jitter = new Vector3(worldXZ.hash(704) - 0.5f, 0f, worldXZ.hash(705) - 0.5f) * 0.36f;
        var tiltAxis = Vector3.Cross(Vector3.up, surfaceNormal);
        var tilt = tiltAxis.sqrMagnitude > 1e-6f
            ? Quaternion.AngleAxis(Mathf.Min(Vector3.Angle(Vector3.up, surfaceNormal), 18f), tiltAxis.normalized)
            : Quaternion.identity;
        var rotation = tilt * Quaternion.AngleAxis(yaw, Vector3.up);
        var anchor = pos - surfaceNormal * 0.06f + tilt * jitter;
        var detail = worldXZ.hash(706);
        var supportsFlowers = biome?.registryId is "plains" or "forest";
        var supportsShrubs = biome?.registryId is "forest" or "taiga";

        if (useMicroVoxelCanopies && biome?.registryId == "forest" && detail < 0.065f)
            PutMicroMushroom(vbuf, anchor, rotation, worldXZ);
        else if (useMicroVoxelCanopies && biome?.registryId == "forest" && detail < 0.18f)
            PutMicroFern(vbuf, anchor, rotation, worldXZ);
        else if (useMicroVoxelCanopies && biome?.registryId == "forest" && detail is > 0.42f and < 0.47f)
            PutMicroMossRock(vbuf, anchor, rotation, worldXZ);
        else if (supportsShrubs && detail > 0.95f && ecology > 0.62f)
            PutMicroShrub(vbuf, anchor, rotation, worldXZ);
        else if (supportsFlowers && detail is >= 0.18f and < 0.225f && ecology > 0.55f)
            PutMicroFlower(vbuf, anchor, rotation, worldXZ);
        else
            PutMicroGrass(vbuf, anchor, rotation, worldXZ);
    }

    static float EcologyField(Vector2Int worldXZ, int cellSize, int salt)
    {
        var gx = Mathf.FloorToInt(worldXZ.x / (float)cellSize);
        var gz = Mathf.FloorToInt(worldXZ.y / (float)cellSize);
        var tx = worldXZ.x / (float)cellSize - gx;
        var tz = worldXZ.y / (float)cellSize - gz;
        tx = tx * tx * (3f - 2f * tx);
        tz = tz * tz * (3f - 2f * tz);

        var a = Mathf.Lerp(new Vector2Int(gx, gz).hash(salt), new Vector2Int(gx + 1, gz).hash(salt), tx);
        var b = Mathf.Lerp(new Vector2Int(gx, gz + 1).hash(salt), new Vector2Int(gx + 1, gz + 1).hash(salt), tx);
        return Mathf.Lerp(a, b, tz);
    }

    static void PutMicroGrass(VertexBuffer vbuf, Vector3 anchor, Quaternion rotation, Vector2Int worldXZ)
    {
        var green = VoxTexRegistry.grass_meadow != null ? VoxTexRegistry.grass_meadow.texIndex : VoxTexRegistry.grass.texIndex;
        var moss = VoxTexRegistry.grass_moss != null ? VoxTexRegistry.grass_moss.texIndex : green;
        var scale = Mathf.Lerp(0.84f, 1.12f, worldXZ.hash(707));
        var stems = worldXZ.hash(708) > 0.76f ? 2 : 1;
        for (int i = 0; i < stems; i++)
        {
            var side = (i - (stems - 1) * 0.5f) * 0.1f;
            var depth = (worldXZ.hash(709 + i) - 0.5f) * 0.1f;
            var segmentHeight = (0.11f + worldXZ.hash(713 + i) * 0.05f) * scale;
            var width = (0.045f + worldXZ.hash(715 + i) * 0.015f) * scale;
            var bladeRotation = rotation * Quaternion.AngleAxis(i * 105f, Vector3.up);
            var lowerRotation = bladeRotation * Quaternion.AngleAxis(8f + worldXZ.hash(717 + i) * 6f, Vector3.forward);
            var root = anchor + rotation * new Vector3(side, 0f, depth);
            var joint = root + lowerRotation * Vector3.up * segmentHeight;

            PutMicroBox(vbuf, i == 0 ? moss : green,
                root + lowerRotation * Vector3.up * (segmentHeight * 0.5f),
                new Vector3(width, segmentHeight, width), lowerRotation, 0f, 0.52f);

            var upperRotation = bladeRotation * Quaternion.AngleAxis(18f + worldXZ.hash(719 + i) * 10f, Vector3.forward);
            PutMicroBox(vbuf, green,
                joint + upperRotation * Vector3.up * (segmentHeight * 0.45f),
                new Vector3(width * 0.82f, segmentHeight * 0.9f, width * 0.82f), upperRotation, 0.48f, 1f);
        }
    }

    static void PutMicroFlower(VertexBuffer vbuf, Vector3 anchor, Quaternion rotation, Vector2Int worldXZ)
    {
        var stemTex = VoxTexRegistry.grass_meadow != null ? VoxTexRegistry.grass_meadow.texIndex : VoxTexRegistry.grass.texIndex;
        var fallbackPetal = VoxTexRegistry.concrete != null ? VoxTexRegistry.concrete.texIndex : stemTex;
        var petalTex = worldXZ.hash(717) > 0.5f && VoxTexRegistry.brick_roof != null
            ? VoxTexRegistry.brick_roof.texIndex
            : fallbackPetal;
        var centerTex = VoxTexRegistry.sand != null ? VoxTexRegistry.sand.texIndex : petalTex;
        var height = Mathf.Lerp(0.28f, 0.38f, worldXZ.hash(718));
        PutMicroBox(vbuf, stemTex, anchor + rotation * new Vector3(0f, height * 0.5f, 0f),
            new Vector3(0.045f, height, 0.045f), rotation, 0f, 0.85f);

        var head = anchor + rotation * new Vector3(0f, height, 0f);
        PutMicroBox(vbuf, centerTex, head, Vector3.one * 0.075f, rotation, 0.75f, 1f);
        for (int i = 0; i < 4; i++)
        {
            var petalRotation = rotation * Quaternion.AngleAxis(i * 90f, Vector3.up);
            PutMicroBox(vbuf, petalTex, head + petalRotation * new Vector3(0.075f, 0f, 0f),
                new Vector3(0.09f, 0.045f, 0.065f), petalRotation, 0.75f, 1f);
        }
    }

    static void PutMicroShrub(VertexBuffer vbuf, Vector3 anchor, Quaternion rotation, Vector2Int worldXZ)
    {
        var leafTex = VoxTexRegistry.grass_moss != null ? VoxTexRegistry.grass_moss.texIndex : VoxTexRegistry.grass.texIndex;
        var stemTex = VoxTexRegistry.log_oak != null ? VoxTexRegistry.log_oak.texIndex : leafTex;
        var scale = Mathf.Lerp(0.68f, 0.9f, worldXZ.hash(719));
        PutMicroBox(vbuf, stemTex, anchor + rotation * new Vector3(0f, 0.14f * scale, 0f),
            new Vector3(0.07f, 0.28f, 0.07f) * scale, rotation, 0f, 0.65f);

        for (int i = 0; i < 4; i++)
        {
            var offset = i switch
            {
                0 => new Vector3(-0.11f, 0.23f, 0f),
                1 => new Vector3(0.11f, 0.25f, 0.02f),
                2 => new Vector3(0f, 0.31f, -0.1f),
                _ => new Vector3(0.01f, 0.33f, 0.1f),
            };
            var size = (0.14f + worldXZ.hash(720 + i) * 0.07f) * scale;
            PutMicroBox(vbuf, leafTex, anchor + rotation * (offset * scale),
                new Vector3(size, size * 0.85f, size), rotation, 0.45f, 1f);
        }
    }

    static void PutMicroFern(VertexBuffer vbuf, Vector3 anchor, Quaternion rotation, Vector2Int worldXZ)
    {
        var texId = VoxTexRegistry.grass_moss != null ? VoxTexRegistry.grass_moss.texIndex : VoxTexRegistry.grass.texIndex;
        var scale = Mathf.Lerp(0.8f, 1.12f, worldXZ.hash(725));
        for (int i = 0; i < 5; i++)
        {
            var leafRotation = rotation * Quaternion.AngleAxis(i * 72f, Vector3.up) * Quaternion.AngleAxis(58f, Vector3.forward);
            var length = (0.18f + worldXZ.hash(726 + i) * 0.08f) * scale;
            PutMicroBox(vbuf, texId,
                anchor + leafRotation * Vector3.up * (length * 0.5f) + Vector3.up * 0.035f,
                new Vector3(0.055f, length, 0.035f) * scale, leafRotation, 0f, 0.72f);
        }
        PutMicroBox(vbuf, texId, anchor + rotation * Vector3.up * (0.11f * scale),
            new Vector3(0.045f, 0.22f, 0.045f) * scale, rotation, 0f, 0.85f);
    }

    static void PutMicroMushroom(VertexBuffer vbuf, Vector3 anchor, Quaternion rotation, Vector2Int worldXZ)
    {
        var stemTex = VoxTexRegistry.concrete != null ? VoxTexRegistry.concrete.texIndex : VoxTexRegistry.sand.texIndex;
        var capTex = worldXZ.hash(732) > 0.45f && VoxTexRegistry.brick_roof != null
            ? VoxTexRegistry.brick_roof.texIndex
            : VoxTexRegistry.grass_moss.texIndex;
        var height = Mathf.Lerp(0.12f, 0.2f, worldXZ.hash(733));
        PutMicroBox(vbuf, stemTex, anchor + rotation * Vector3.up * (height * 0.5f),
            new Vector3(0.045f, height, 0.045f), rotation, 0f, 0.75f);
        var cap = anchor + rotation * Vector3.up * height;
        PutMicroBox(vbuf, capTex, cap, new Vector3(0.14f, 0.055f, 0.14f), rotation, 0.72f, 1f);
        PutMicroBox(vbuf, capTex, cap + rotation * Vector3.up * 0.045f,
            new Vector3(0.085f, 0.045f, 0.085f), rotation, 0.78f, 1f);
    }

    static void PutMicroMossRock(VertexBuffer vbuf, Vector3 anchor, Quaternion rotation, Vector2Int worldXZ)
    {
        var texId = VoxTexRegistry.rock_mossy != null ? VoxTexRegistry.rock_mossy.texIndex : VoxTexRegistry.rock.texIndex;
        var scale = Mathf.Lerp(0.1f, 0.19f, worldXZ.hash(734));
        PutMicroBox(vbuf, texId, anchor + rotation * Vector3.up * (scale * 0.35f),
            new Vector3(scale, scale * 0.7f, scale * 0.85f), rotation, 0f, 0.35f);
    }

    static void PutMicroTree(VertexBuffer vbuf, Vector3 anchor, Vector3 surfaceNormal, Vector2Int worldXZ)
    {
        var trunkTex = VoxTexRegistry.log_oak != null ? VoxTexRegistry.log_oak.texIndex : VoxTexRegistry.dirt.texIndex;
        var leafTex = VoxTexRegistry.grass_moss != null ? VoxTexRegistry.grass_moss.texIndex : VoxTexRegistry.grass.texIndex;
        var crownTex = VoxTexRegistry.grass_meadow != null ? VoxTexRegistry.grass_meadow.texIndex : leafTex;
        var yaw = Quaternion.AngleAxis(worldXZ.hash(740) * 360f, Vector3.up);
        var height = Mathf.Lerp(3.6f, 5.2f, worldXZ.hash(741));
        var trunkWidth = Mathf.Lerp(0.32f, 0.48f, worldXZ.hash(742));
        var tiltAxis = Vector3.Cross(Vector3.up, surfaceNormal);
        var tilt = tiltAxis.sqrMagnitude > 1e-6f
            ? Quaternion.AngleAxis(Mathf.Min(Vector3.Angle(Vector3.up, surfaceNormal), 8f), tiltAxis.normalized)
            : Quaternion.identity;
        var rotation = tilt * yaw;

        var trunkSegments = Mathf.CeilToInt(height / 0.8f);
        for (int i = 0; i < trunkSegments; i++)
        {
            var segmentHeight = Mathf.Min(0.8f, height - i * 0.8f);
            var center = anchor + rotation * Vector3.up * (i * 0.8f + segmentHeight * 0.5f);
            var taper = Mathf.Lerp(1f, 0.72f, i / (float)Mathf.Max(1, trunkSegments - 1));
            PutMicroBox(vbuf, trunkTex, center,
                new Vector3(trunkWidth * taper, segmentHeight, trunkWidth * taper), rotation, 0f, 0.2f);
        }

        var crownCenter = anchor + rotation * Vector3.up * (height + 0.15f);
        var radius = Mathf.Lerp(0.9f, 1.3f, worldXZ.hash(743));
        PutMicroBox(vbuf, leafTex, crownCenter, new Vector3(radius * 1.5f, 0.9f, radius * 1.25f), rotation, 0.25f, 0.82f);
        PutMicroBox(vbuf, crownTex, crownCenter + rotation * new Vector3(0f, 0.72f, 0f),
            new Vector3(radius * 1.15f, 0.75f, radius), rotation, 0.5f, 1f);
        for (int i = 0; i < 4; i++)
        {
            var branchRotation = rotation * Quaternion.AngleAxis(i * 90f + worldXZ.hash(744) * 35f, Vector3.up);
            var offset = branchRotation * new Vector3(radius * 0.72f, -0.12f + (i & 1) * 0.22f, 0f);
            PutMicroBox(vbuf, i % 2 == 0 ? leafTex : crownTex, crownCenter + offset,
                new Vector3(radius * 0.72f, 0.62f, radius * 0.65f), branchRotation, 0.35f, 0.95f);
        }

        // 根部散落的小枝让树与地表生态连起来，避免像单独插在地上的模型。
        for (int i = 0; i < 3; i++)
        {
            var rootRotation = rotation * Quaternion.AngleAxis(i * 120f + worldXZ.hash(745) * 60f, Vector3.up)
                * Quaternion.AngleAxis(72f, Vector3.forward);
            PutMicroBox(vbuf, trunkTex, anchor + rootRotation * Vector3.up * 0.28f,
                new Vector3(0.12f, 0.56f, 0.12f), rootRotation, 0f, 0.18f);
        }
    }

    static void PutMicroBox(VertexBuffer vbuf, UInt16 texId, Vector3 center, Vector3 size, Quaternion rotation,
        float windBottom, float windTop)
    {
        for (int i = 0; i < CUBE_POS.Length / 3; i++)
        {
            var cubePos = Maths.AsVec3(CUBE_POS, i * 3);
            var p = rotation * Vector3.Scale(cubePos - Vector3.one * 0.5f, size) + center;
            // 微小植被侧面若完全使用水平法线，在 HDRP 强方向光下会变成黑柱；向上混合法线保持体块可读。
            var n = Vector3.Slerp(rotation * Maths.AsVec3(CUBE_NORM, i * 3), Vector3.up, 0.62f).normalized;
            var uv = Maths.Vec2(CUBE_UV, i * 2);
            uv.y = Mathf.Lerp(windBottom, windTop, cubePos.y) * 0.999f + 0.0005f;
            uv = VoxTexRegistry.instance.MapUV(uv, texId);
            vbuf.PushVertex(p, uv, n);
        }
    }

    public static void PutLeaves(VertexBuffer vbuf, UInt16 texId, Vector3 pos, float siz = 1.2f) {
        if (useMicroVoxelCanopies)
        {
            var center = pos + Vector3.one * 0.5f;
            var leafTex = VoxTexRegistry.grass_moss != null ? VoxTexRegistry.grass_moss.texIndex : texId;
            PutMicroBox(vbuf, leafTex, center, Vector3.one * 0.9f, Quaternion.identity, 0.15f, 1f);
            return;
        }

        var deg45 = 180 / 4.0f;
        pos += 0.5f * Vector3.one;

        PutFace(vbuf, texId, pos, Quaternion.AngleAxis(deg45, Vector3.up), new Vector2(1.4f, 1.0f) * siz);
        PutFace(vbuf, texId, pos, Quaternion.AngleAxis(deg45*3.0f, Vector3.up), new Vector2(1.4f, 1.0f) * siz);
        
        PutFace(vbuf, texId, pos, Quaternion.AngleAxis(-deg45, Vector3.forward), new Vector2(1.0f, 1.4f) * siz);
        PutFace(vbuf, texId, pos, Quaternion.AngleAxis(-deg45*3.0f, Vector3.forward), new Vector2(1.0f, 1.4f) * siz);
    }
    
    // 草丛：底部锚定在地表 feature point（调用方需 +0.5 对齐 SurfaceNets 顶点）；顶点法线统一用地表法线（接地光照）。
    // 5 quad/丛：3 竖直交叉 + 2 外倾短 quad；由 worldXZ 确定性随机 yaw/scale/jitter（salt 651+，勿与 worldgen 645/646 复用）。
    public static void PutGrass(VertexBuffer vbuf, UInt16 texId, float3 pos, Vector3 up, Vector2Int worldXZ) {
        var randYaw = worldXZ.hash(651) * 360f;
        var scale = Mathf.Lerp(0.85f, 1.25f, worldXZ.hash(652));
        var jitter = new Vector3(worldXZ.hash(653) - 0.5f, 0, worldXZ.hash(654) - 0.5f) * 0.4f;

        // 倾斜角钳制：体素梯度法线噪声大，全量贴合会显得「草比坡还斜」
        var tilt = Quaternion.identity;
        var tiltAxis = Vector3.Cross(Vector3.up, up);
        if (tiltAxis.sqrMagnitude > 1e-6f)
            tilt = Quaternion.AngleAxis(Mathf.Min(Vector3.Angle(Vector3.up, up), 20f), tiltAxis.normalized);

        var anchor = (Vector3)pos - up * 0.08f + jitter;  // 沿法线稍下沉，防坡地悬浮

        // 光照法线往 up 混合：抑制梯度法线噪声导致的草丛明暗不一
        var lightN = Vector3.Slerp(up, Vector3.up, 0.4f).normalized;

        const float crossAng = 180f / 3f;
        for (int i = 1; i <= 3; i++)
            PutFaceBottom(vbuf, texId, anchor, tilt * Quaternion.AngleAxis(randYaw + crossAng * i, Vector3.up), Vector2.one * scale, lightN);

        // 斜插 2 个外倾短 quad 补体积
        for (int i = 0; i < 2; i++) {
            var lean = Quaternion.AngleAxis(randYaw + 90f + i * 170f, Vector3.up) * Quaternion.AngleAxis(25f, Vector3.right);
            PutFaceBottom(vbuf, texId, anchor, tilt * lean, new Vector2(0.8f, 0.7f) * scale, lightN);
        }
    }

    // put a bottom-anchored -X face at pos (bottom edge centered). for ground foliage.
    public static void PutFaceBottom(VertexBuffer vbuf, UInt16 texId, Vector3 pos, Quaternion rot, Vector2 scale, Vector3 norm)
    {
        for (int i = 0; i < 6; i++) {
            var p = Maths.AsVec3(CUBE_POS, i*3) - new Vector3(0.0f, 0.0f, 0.5f); // x=0 平面: y∈[0,1] 底部锚定, z 居中
            p = (rot * (p * new float3(1.0f, scale.y, scale.x))) + pos;

            var uv = Maths.Vec2(CUBE_UV, i * 2);
            uv.y = uv.y * 0.999f + 0.0005f;  // 压缩 v 避开 tile 顶边 frac 回绕（WindWaving 弯曲权重用）
            uv = VoxTexRegistry.instance.MapUV(uv, texId);

            vbuf.PushVertex(p, uv, norm);
        }
    }
    
    // put a -X face in middle of pos. for foliages.
    public static void PutFace(VertexBuffer vbuf, UInt16 texId, Vector3 pos, Quaternion rot, Vector2 scale)
    {
        // -X Face
        for (int i = 0;i < 6;i++) {
            // 6 verts
            var p = Maths.AsVec3(CUBE_POS, i*3) - new Vector3(0.0f, 0.5f, 0.5f); // -0.5: centerized for proper rotation
            p = (rot * (p * new float3(1.0f, scale.y, scale.x))) + pos;

            var n = Maths.AsVec3(CUBE_NORM, i * 3);
            n = rot * n;

            var uv = Maths.Vec2(CUBE_UV, i * 2);
            uv.y = uv.y * 0.999f + 0.0005f;  // 压缩 v 避开 tile 顶边 frac 回绕（WindWaving 弯曲权重用）
            uv = VoxTexRegistry.instance.MapUV(uv, texId);
            // uv.x += tex_id;
            // uv.y += light;

            vbuf.PushVertex(p, uv, n);
        }
    }

    #endregion


    #region SurfaceNets, Isosurface


    public static IVec3[] SN_VERT = {
        new(0, 0, 0),  // 0
        new(0, 0, 1),
        new(0, 1, 0),  // 2
        new(0, 1, 1),
        new(1, 0, 0),  // 4
        new(1, 0, 1),
        new(1, 1, 0),  // 6
        new(1, 1, 1)
    };
    // from min to max in each Edge.  axis order x y z.
    // Diagonal Edge in Cell is in-axis-flip-index edge.  i.e. diag of edge[axis*4 +i] is edge[axis*4 +(3-i)]
    /*     +--2--+    +-----+    +-----+
        *    /|    /|   /7    /6  11|    10
        *   +--3--+ |  +-----+ |  +-----+ |
        *   | +--0|-+  5 +---4-+  | +---|-+
        *   |/    |/   |/    |/   |9    |8
        *   +--1--+    +-----+    +-----+
        *   |3  2| winding. for each axis.
        *   |1  0|
        */
    static int[,] EDGE = {  // [12,2]
        {0,4}, {1,5}, {2,6}, {3,7},  // X
        {5,7}, {1,3}, {4,6}, {0,2},  // Y
        {4,5}, {0,1}, {6,7}, {2,3}   // Z
    };
    // static Vox[,,] PresampledVoxels(Chunk chunk, int lodLevel) {
    //     int step = 1 << lodLevel;
    //     Vox[,,] presampledVoxels = new Vox[16, 16, 16];
    //     for (int lx = 0; lx < 16; lx += step)
    //     for (int ly = 0; ly < 16; ly += step)
    //     for (int lz = 0; lz < 16; lz += step) 
    //     {
    //         int3 lp = new(lx, ly, lz);
    //         presampledVoxels[lx, ly, lz] = chunk.AtVoxel(lp);
    //     }
    //     return presampledVoxels;
    // }


    static bool SN_SignChanged(float density0, float density1)
    {
        return (density0 > 0) != (density1 > 0);
    }

    static Vector3 SN_GradAtPoint(IVec3 cellPos, Vector3 fp, IVegetationSurface chunk, int step)
    {
        float d000 = chunk.ReadVoxel(cellPos).Density;
        float d100 = chunk.ReadVoxel(cellPos + new IVec3(step, 0, 0)).Density;
        float d010 = chunk.ReadVoxel(cellPos + new IVec3(0, step, 0)).Density;
        float d110 = chunk.ReadVoxel(cellPos + new IVec3(step, step, 0)).Density;
        float d001 = chunk.ReadVoxel(cellPos + new IVec3(0, 0, step)).Density;
        float d101 = chunk.ReadVoxel(cellPos + new IVec3(step, 0, step)).Density;
        float d011 = chunk.ReadVoxel(cellPos + new IVec3(0, step, step)).Density;
        float d111 = chunk.ReadVoxel(cellPos + new IVec3(step, step, step)).Density;

        float3 t = math.saturate(new float3(fp) / step);
        float3 s = 1 - t;

        var grad = new Vector3(
            (d100-d000)*s.y*s.z + (d110-d010)*t.y*s.z + (d101-d001)*s.y*t.z + (d111-d011)*t.y*t.z,
            (d010-d000)*s.x*s.z + (d110-d100)*t.x*s.z + (d011-d001)*s.x*t.z + (d111-d101)*t.x*t.z,
            (d001-d000)*s.x*s.y + (d101-d100)*t.x*s.y + (d011-d010)*s.x*t.y + (d111-d110)*t.x*t.y
        );

        if (grad.sqrMagnitude > 1e-6f)
            return grad.normalized;

        for (int r = 1; r <= 3; r++)
        {
            grad = new Vector3(
                chunk.ReadVoxel(cellPos + new IVec3(r, 0, 0)).Density - chunk.ReadVoxel(cellPos - new IVec3(r, 0, 0)).Density,
                chunk.ReadVoxel(cellPos + new IVec3(0, r, 0)).Density - chunk.ReadVoxel(cellPos - new IVec3(0, r, 0)).Density,
                chunk.ReadVoxel(cellPos + new IVec3(0, 0, r)).Density - chunk.ReadVoxel(cellPos - new IVec3(0, 0, r)).Density
            );
            if (grad.sqrMagnitude > 1e-4f)
                return grad.normalized;
        }

        return Vector3.up;
    }
    
    // PARAMS: int edge, float3 point
    public static Action<int, Vector3> DebugFeaturePointEdgeResult;

    // Evaluate FeaturePoint
    // returns cell-local point.
    public static Vector3 SN_FeaturePoint(IVec3 relpos, IVegetationSurface chunk, int step = 1)
    {
        int signchanges = 0;
        var sumFp = Vector3.zero;

        for (int edgeIdx = 0; edgeIdx < 12; ++edgeIdx)
        {
            var p0 = SN_VERT[EDGE[edgeIdx, 0]];
            var p1 = SN_VERT[EDGE[edgeIdx, 1]] * step;
            Vox v0 = chunk.ReadVoxel(relpos + p0);
            Vox v1 = chunk.ReadVoxel(relpos + p1);

            if (SN_SignChanged(v0.Density, v1.Density))
            {
                float t = math.unlerp(v0.Density, v1.Density, 0);
                if (!float.IsFinite(t)) t = 0;  // t maybe NaN if accessing a Nil Cell.

                var p = Vector3.Lerp(p0, p1, t);

#if UNITY_EDITOR
                if (DebugFeaturePointEdgeResult != null) {
                    DebugFeaturePointEdgeResult(edgeIdx, p);
                }
#endif

                sumFp += p;
                ++signchanges;
            }
        }

        // Assert.AreNotEqual(signchanges, 0, "FpEval Error: No SignChange.");
        // Assert.IsTrue(float.IsFinite(sumFp.x), "FpEval Error: Non-Finite Fp Value.");

        return sumFp / signchanges;
    }

    public static void SN_FeaturePoint_Normal(IVegetationSurface chunk, IVec3 rp, out Vector3 fp, out Vector3 normal, int step)
    {
        fp = SN_FeaturePoint(rp, chunk, step);
        normal = -SN_GradAtPoint(rp, fp, chunk, step);
    }

    #endregion


}
}
