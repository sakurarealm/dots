

#include <UnityShaderVariables.cginc>

float _AetherWetness;
#include "Assets/Contents/Voxel/Shaders/TerrainTransition.hlsl"
// LOD flag plus the actual near boundary field define a continuous presentation band.
float _AetherFarTerrainLook;
float _AetherFarRockTile;
TEXTURE2D(_AetherMacroColor);
SAMPLER(sampler_AetherMacroColor);
float4 _AetherMacroRect;
float4 _AetherMacroFocus; // world min XZ / max XZ, zero for uniform bootstrap
float AetherMacroInverseOuter(float value, float edgeSlope)
{
    float a = 2.0 - edgeSlope;
    float b = 1.0 - edgeSlope;
    return 2.0 * value / (a + sqrt(max(0.0, a * a - 4.0 * b * value)));
}
float AetherMacroGridAxis(float p, float lo, float hi, float size)
{
    float band = hi - lo;
    if (p < lo)
        return .25 * AetherMacroInverseOuter(p / lo, saturate(band / (2.0 * lo)));
    if (p <= hi) return .25 + (p - lo) / band * .5;
    float right = size - hi;
    return 1.0 - .25 * AetherMacroInverseOuter((size - p) / right,
        saturate(band / (2.0 * right)));
}
float2 AetherMacroColorUV(float2 worldXZ)
{
    float width = _AetherMacroRect.w;
    float2 grid = (worldXZ - _AetherMacroRect.xy) / _AetherMacroRect.z;
    if (_AetherMacroFocus.z > _AetherMacroFocus.x)
    {
        float2 p = worldXZ - _AetherMacroRect.xy;
        float2 lo = _AetherMacroFocus.xy - _AetherMacroRect.xy;
        float2 hi = _AetherMacroFocus.zw - _AetherMacroRect.xy;
        grid = float2(AetherMacroGridAxis(p.x,lo.x,hi.x,_AetherMacroRect.z),
            AetherMacroGridAxis(p.y,lo.y,hi.y,_AetherMacroRect.z));
    }
    return (grid * (width - 1) + .5) / width;
}
TEXTURE2D(_AetherMacroStrata);
SAMPLER(sampler_AetherMacroStrata);
float _AetherMacroStrataRows;
float3 AetherMacroColumnColor(float4 column, float worldY)
{
    int row = (int)round(column.a) - 2;
    if (row < 0 || row >= (int)_AetherMacroStrataRows) return column.rgb;
    float period = _AetherMacroStrata.Load(int3(0,row,0)).a;
    return SAMPLE_TEXTURE2D_LOD(_AetherMacroStrata, sampler_AetherMacroStrata,
        float2(frac((worldY-.5)/max(1.0,period)), (row+.5)/_AetherMacroStrataRows), 0).rgb;
}
float3 AetherMacroSurfaceColor(float2 uv, float worldY)
{
    if (_AetherMacroStrataRows < .5)
        return SAMPLE_TEXTURE2D_LOD(_AetherMacroColor,sampler_AetherMacroColor,uv,0).rgb;
    // Resolve each column's actual world-Y geology before interpolation. Top colors
    // stretched down tall macro triangles used to erase or diagonalize Mesa bands.
    float2 grid = uv * _AetherMacroRect.w - .5;
    int2 p = (int2)floor(grid);
    int edge = (int)_AetherMacroRect.w - 1;
    float3 a = AetherMacroColumnColor(_AetherMacroColor.Load(int3(clamp(p,int2(0,0),int2(edge,edge)),0)),worldY);
    float3 b = AetherMacroColumnColor(_AetherMacroColor.Load(int3(clamp(p+int2(1,0),int2(0,0),int2(edge,edge)),0)),worldY);
    float3 c = AetherMacroColumnColor(_AetherMacroColor.Load(int3(clamp(p+int2(0,1),int2(0,0),int2(edge,edge)),0)),worldY);
    float3 d = AetherMacroColumnColor(_AetherMacroColor.Load(int3(clamp(p+int2(1,1),int2(0,0),int2(edge,edge)),0)),worldY);
    return lerp(lerp(a,b,frac(grid.x)),lerp(c,d,frac(grid.x)),frac(grid.y));
}
float4 _AetherMacroRock;
// Registry owns atlas layout. Material assets and their runtime clones may predate added tiles.
float _VoxTexAtlasGrid;
float _AetherTerrainStyleTileCount;
float4 _AetherTerrainStyleTiles[64];
float4 _AetherStyleSimpleSurfaceIds;
float4 _AetherStyleMcTiles[2];

float AetherStyleAtlasTile(float tile)
{
	int index = (int)round(tile);
	if (index >= 0 && index < (int)_AetherTerrainStyleTileCount)
		return _AetherTerrainStyleTiles[index / 4][index % 4];
	return tile;
}
float _AetherSnow;
float _AetherMacroVariation;
float _AetherDistanceDesaturation;
float _AetherTerrainAoFloor;
float _AetherTerrainNprAmount;
float4 _AetherNprStoneIds;
float4 _AetherNprWoodIds;
float4 _AetherNprGroundIds;

float AetherMacroNoise(float2 p)
{
	p = floor(p);
	return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float AetherSmoothNoise(float2 p)
{
	float2 cell = floor(p);
	float2 f = frac(p);
	f = f * f * (3.0 - 2.0 * f);
	float a = AetherMacroNoise(cell);
	float b = AetherMacroNoise(cell + float2(1.0, 0.0));
	float c = AetherMacroNoise(cell + float2(0.0, 1.0));
	float d = AetherMacroNoise(cell + float2(1.0, 1.0));
	return lerp(lerp(a, b, f.x), lerp(c, d, f.x), f.y);
}

float AetherFarLookWeight(float3 worldPos)
{
    // The distance ramp softens the visual handoff; renderer ownership is the isolation gate.
    return AetherTerrainSurfaceOwner(worldPos,_AetherFarTerrainLook) * step(0.5, _AetherTerrainStyleTileCount)
        * smoothstep(60.0, 180.0, distance(_WorldSpaceCameraPos, worldPos));
}

float AetherFarRockMask(float tile)
{
    return 1.0 - step(0.25, abs(AetherStyleAtlasTile(tile) - _AetherFarRockTile));
}

#include "Assets/Resources/Lighting/LandscapeBrush.hlsl"

float AetherNaturalSlopeRock(float3 normal, float rock, float ground)
{
    float exposed = smoothstep(.18, .58, 1.0 - abs(normalize(normal).y));
    return saturate(rock + (1.0 - rock) * exposed * ground);
}

void AetherNaturalRockBase(float rock, inout float3 albedo)
{
    // The same slope treatment for near, density LOD and bootstrap shell.
    // Restrained mixing retains authored/tinted regions instead of a flat gray cliff.
    if (_AetherMacroRock.a > .5) albedo = lerp(albedo, _AetherMacroRock.rgb, saturate(rock) * .45);
}


void ApplyAetherLandscapePaint(float3 worldPos, float3 worldNorm, float rock,
    inout float3 albedo)
{
    // All actual world terrain shares the same pigment, including the foreground.
    // Ownership still isolates buildings/previews; distance never changes base hue.
    float owner = max(step(.5, _AetherTerrainOwner), saturate(_AetherFarTerrainLook))
        * step(.5, _AetherTerrainStyleTileCount);
    ApplyAetherTerrainPigment(worldPos, worldNorm, distance(_WorldSpaceCameraPos, worldPos),
        owner, rock, albedo);
}

void ApplyAetherFarRock(float rockCoverage, float3 worldPos, float3 worldNorm,
    inout float3 albedo, inout float3 normal, inout float smoothness)
{
    float amount = AetherFarLookWeight(worldPos) * saturate(rockCoverage);
    ApplyAetherLandscapePaint(worldPos, worldNorm, rockCoverage, albedo);
    if (amount <= .0001) return;
    normal = normalize(lerp(normal, normalize(worldNorm), amount * .78));
    smoothness = lerp(smoothness, min(smoothness, .2), amount * (1.0 - saturate(_AetherWetness)));
}

float AetherNprMatches(float texId, float4 ids)
{
	float4 matches = 1.0 - step(0.25, abs(ids - texId));
	return saturate(dot(matches, float4(1, 1, 1, 1))) * step(0.5, texId);
}

void ApplyAetherMaterialNpr(float texId, float3 worldNorm, inout float3 albedo, inout float3 normal, inout float smoothness, float metallic)
{
	float amount = saturate(_AetherTerrainNprAmount);
	if (amount <= 0.0001)
		return;

	// 首批只接入明确的岩石、木材、道路/泥土 ID；其他材质保持原样。
	float stone = AetherNprMatches(texId, _AetherNprStoneIds);
	float wood = AetherNprMatches(texId, _AetherNprWoodIds);
	float ground = AetherNprMatches(texId, _AetherNprGroundIds);
	amount *= saturate(stone + wood + ground) * (1.0 - saturate(metallic));
	if (amount <= 0.0001)
		return;

	// 连续压缩贴图微对比，取消 floor 色阶，保留真实灯光/投影与材质原色。
	float sourceLuma = max(0.025, dot(albedo, float3(0.2126, 0.7152, 0.0722)));
	float centerLuma = stone * 0.23 + wood * 0.14 + ground * 0.18;
	float paintedLuma = lerp(sourceLuma, centerLuma, 0.22);
	float3 painted = albedo * (paintedLuma / sourceLuma);

	// 顶面略暖、竖直面略冷，使道路/屋顶与崖壁/墙面形成可读的大色面。
	// 色差只作用于本材质，且不依赖太阳方向，因此天气和昼夜切换不会出现突然翻面。
	float upward = saturate(worldNorm.y * 0.5 + 0.5);
	float topPlane = smoothstep(0.58, 0.9, upward);
	float3 planeTint = lerp(float3(0.97, 0.99, 1.025), float3(1.025, 1.008, 0.975), topPlane);
	painted *= lerp(float3(1.0, 1.0, 1.0), planeTint, stone * 0.5);
	albedo = lerp(albedo, painted, amount);
	// 采用宏观几何法线作为稳定基底；木纹保留更多凹凸，石壁和道路减少碎高光。
	float normalReduction = stone * 0.58 + wood * 0.28 + ground * 0.65;
	normal = normalize(lerp(normal, worldNorm, amount * normalReduction));

	// 风格化表面默认更哑光；雨水仍可恢复地表高光，避免 NPR 把既有湿地反馈抹掉。
	float matteAmount = amount * (1.0 - saturate(_AetherWetness) * 0.88);
	float matteLimit = stone * 0.28 + wood * 0.2 + ground * 0.14;
	smoothness = lerp(smoothness, min(smoothness, matteLimit), matteAmount * 0.72);
}

void ApplyAetherEnvironment(float3 worldPos, float3 worldNorm, inout float3 albedo, inout float smoothness)
{
	float cameraDistance = distance(_WorldSpaceCameraPos, worldPos);
	float sourceLuma = max(0.025, dot(albedo, float3(0.2126, 0.7152, 0.0722)));

	// 近景 atlas 纹理原始明暗起伏较碎。只压缩最靠近镜头的微对比，保留原色相和材质身份；
	// 远离镜头后迅速退出，避免整片地形被洗成同一种平均色。
	float nearDetail = 1.0 - smoothstep(18.0, 105.0, cameraDistance);
	float softenedLuma = lerp(0.5, sourceLuma, 0.82);
	albedo *= lerp(1.0, softenedLuma / sourceLuma, nearDetail * 0.22);

	// 三个互不对齐的世界空间低频场形成 40~260m 尺度的地貌色块。
	// 最宽尺度决定冷暖区域，中尺度决定湿润/枯黄倾向，细尺度仅打散重复，不产生 Chunk 方边。
	float regionField = AetherSmoothNoise((worldPos.xz + float2(131.0, 47.0)) / 260.0);
	float moistureField = AetherSmoothNoise((worldPos.xz - float2(73.0, 191.0)) / 105.0);
	float breakupField = AetherSmoothNoise((worldPos.xz + float2(37.0, 83.0)) / 38.0) - 0.5;
	float macroBroad = regionField - 0.5;
	float macroMid = moistureField - 0.5;
	float macro = macroBroad * 0.58 + macroMid * 0.28 + breakupField * 0.14;
	albedo *= 1.0 + macro * _AetherMacroVariation;

	// 低地略暖且更茂盛，高地与陡坡略冷、略低饱和，建立地貌纵深。
	// 权重保持克制，因为同一体素材质也会服务玩家建筑，不能把竖直墙面强制染成岩壁。
	float highland = smoothstep(58.0, 150.0, worldPos.y);
	float steepness = smoothstep(0.28, 0.82, 1.0 - saturate(worldNorm.y));
	float warmRegion = smoothstep(0.34, 0.72, regionField) * (1.0 - highland * 0.55);
	float lushRegion = smoothstep(0.38, 0.76, moistureField) * saturate(worldNorm.y * 1.35);
	float3 regionalTint = lerp(float3(0.965, 1.015, 0.985), float3(1.055, 1.018, 0.93), warmRegion * 0.38);
	regionalTint = lerp(regionalTint, float3(0.94, 1.035, 0.975), lushRegion * 0.22);
	regionalTint = lerp(regionalTint, float3(0.91, 0.96, 1.035), highland * 0.2 + steepness * 0.12);
	albedo *= regionalTint;

	float terrainLuma = dot(albedo, float3(0.2126, 0.7152, 0.0722));
	float terrainDesaturation = saturate(highland * 0.1 + steepness * 0.08);
	albedo = lerp(albedo, terrainLuma.xxx, terrainDesaturation);
	smoothness = saturate(smoothness * lerp(0.96, 0.82, steepness * 0.28));

	// 湿润底层保留材质可读性：坡面只略微变深、略增光泽，不再把整片地表统一压黑成塑料。
	float rainAmount = saturate(_AetherWetness);
	float upward = saturate(worldNorm.y * 0.5 + 0.5);
	float wetBreakup = AetherSmoothNoise((worldPos.xz + float2(11.0, 43.0)) / 10.0) * 0.55
		+ AetherSmoothNoise((worldPos.xz - float2(23.0, 7.0)) / 34.0) * 0.45;
	float damp = rainAmount * lerp(0.52, 1.0, upward) * lerp(0.82, 1.0, wetBreakup);
	albedo *= lerp(1.0, 0.79, damp);
	smoothness = lerp(smoothness, max(smoothness, 0.68), damp);

	// 只有近水平表面出现水膜与积水。双尺度世界噪声让水斑跨 Chunk 连续，降雨增强时自然扩张；
	// 不伪造屏幕空间反射，开启 SSR 时由真实光滑度接入，关闭时仍能读取天空环境高光。
	float flatMask = smoothstep(0.82, 0.965, worldNorm.y);
	float puddleNoise = AetherSmoothNoise(worldPos.xz / 6.5) * 0.58
		+ AetherSmoothNoise((worldPos.xz + float2(31.0, 17.0)) / 21.0) * 0.42;
	float puddleSpread = smoothstep(0.72 - rainAmount * 0.22, 0.86 - rainAmount * 0.18, puddleNoise);
	float waterFilm = rainAmount * flatMask * smoothstep(0.42, 0.72, wetBreakup);
	float puddle = rainAmount * flatMask * puddleSpread;
	albedo *= lerp(1.0, 0.91, waterFilm);
	albedo *= lerp(1.0, 0.84, puddle);
	smoothness = lerp(smoothness, max(smoothness, 0.82), waterFilm * 0.72);
	smoothness = lerp(smoothness, 0.95, puddle);

	// 积雪随天气强度渐进扩张：初雪先落在平坦的局部斑块，强降雪才连接成大面积覆盖。
	// 双尺度平滑噪声保持跨 Chunk 连续，同时避免纯随机椒盐点和规则方格。
	float snowAmount = saturate(_AetherSnow);
	float snowSlope = smoothstep(0.22, 0.82, worldNorm.y);
	float snowPattern = AetherSmoothNoise((worldPos.xz + float2(13.0, 47.0)) / 5.0) * 0.62
		+ AetherSmoothNoise((worldPos.xz - float2(29.0, 11.0)) / 17.0) * 0.38;
	float snowSpread = smoothstep(0.68 - snowAmount * 0.62, 0.82 - snowAmount * 0.46, snowPattern);
	float snowMask = snowSlope * snowSpread * snowAmount;
	float snowNoise = lerp(0.82, 1.0, AetherSmoothNoise(worldPos.xz / 3.0));
	albedo = lerp(albedo, float3(0.78, 0.84, 0.88) * snowNoise, snowMask);
	smoothness = lerp(smoothness, 0.38, snowMask);

	// 远景不直接退成灰色：先压缩纹理对比，再轻微汇入天空冷色，形成可读的山体层级。
	float distanceFade = saturate((cameraDistance - 105.0) / 920.0)
		* saturate(_AetherDistanceDesaturation);
	float luma = dot(albedo, float3(0.2126, 0.7152, 0.0722));
	float3 distantBase = lerp(luma.xxx, float3(luma * 0.88, luma * 0.96, luma * 1.05), 0.52);
	albedo = lerp(albedo, distantBase, distanceFade * 0.72);
	albedo *= lerp(1.0, 0.94, distanceFade);
}

// 染色：属性由 Terrain ShaderGraph Blackboard 声明（_VoxTintVolume / _VoxTintPalette / _VoxTintEnabled / _VoxTintSize）
// objectNormal：物体空间外法线。
// Cube / Slab / Stairs：顶点在 [cell, cell+1]，微偏即可。
// SurfaceNets / MC：顶点 = dualCell + fp + 0.5，需 objectPos-0.5 再 floor（与 PickTexId 一致）。
// isIsoSurface：由网格 UV.x 符号传入（等值面写 -texId，方块写 +texId），避免「无染色回退」把邻格色溢到 Cube。
// RG8 volume: R=palette index, G=solid. 采样算法来自 main 的 VoxTintSampling.hlsl（等值面取最近实心角点，含 LoD 邻接 padding）。
float4 SampleVoxTint(float3 objectPos, float3 objectNormal, bool isIsoSurface)
{
#if defined(SHADERGRAPH_PREVIEW)
	return float4(1, 1, 1, 1);
#else
	if (_VoxTintEnabled < 0.5)
		return float4(1, 1, 1, 1);

	float3 size = max(_VoxTintSize.xyz, float3(1, 1, 1));
	float3 n = objectNormal;
	float nLenSq = dot(n, n);
	float3 inward = nLenSq > 1e-8
		? n * rsqrt(nLenSq) * 0.001
		: float3(0.0001, 0.0001, 0.0001);

	float3 samplePos = isIsoSurface
		? objectPos - 0.5 - inward
		: objectPos - inward;
	samplePos += _VoxTintSize.w; // Near chunks and LoD include neighbor padding; standalone volumes use w=0.
	float3 cell = floor(samplePos);
	float idx01 = 0;
	if (isIsoSurface)
	{
		// All eight corners support the surface. Pick the closest solid, including unpainted solids.
		// Never search for "a nonzero tint": that would smear paint across real white regions.
		float bestDistance = 1e20;
		[unroll] for (int i = 0; i < 8; i++)
		{
			float3 corner = cell + float3(i & 1, (i >> 1) & 1, (i >> 2) & 1);
			corner = clamp(corner, float3(0,0,0), size - 1.0);
			float2 voxelTint = SAMPLE_TEXTURE3D_LOD(_VoxTintVolume, sampler_VoxTintVolume, (corner + 0.5) / size, 0).rg;
			float3 delta = corner - samplePos;
			float distanceSq = dot(delta, delta);
			if (voxelTint.g > 0.5 && distanceSq < bestDistance)
			{
				bestDistance = distanceSq;
				idx01 = voxelTint.r;
			}
		}
	}
	else
	{
		cell = clamp(cell, float3(0, 0, 0), size - 1.0);
		idx01 = SAMPLE_TEXTURE3D_LOD(_VoxTintVolume, sampler_VoxTintVolume, (cell + 0.5) / size, 0).r;
	}
	float2 palUv = float2((idx01 * 255.0 + 0.5) / 256.0, 0.5);
	return SAMPLE_TEXTURE2D_LOD(_VoxTintPalette, sampler_VoxTintPalette, palUv, 0);
#endif
}

// Alpha 254 is an explicit palette mode tag; old palettes (255) remain exact multiply.
float AetherTargetTint(float4 tint)
{
	return 1.0 - step(0.4, abs(tint.a * 255.0 - 254.0));
}

float3 ApplyVoxTint(float3 albedo, float4 tint)
{
	if (AetherTargetTint(tint) < 0.5) return albedo * tint.rgb;
	// Preserve a restrained luminance pattern, without inheriting the substitute material's hue.
	float luma = dot(albedo, float3(0.2126, 0.7152, 0.0722));
	float detail = lerp(0.88, 1.12, saturate(luma));
	return saturate(tint.rgb * detail);
}

void ApplyAetherSimpleStyle(float tile, float4 tint, float3 worldNorm,
    inout float3 albedo, inout float3 normal, inout float metallic, inout float smoothness)
{
    if (_AetherTerrainStyleTileCount <= 0.0) return;
    float id = tile + 1.0;
    bool metal = abs(id - _AetherStyleSimpleSurfaceIds.x) < 0.25 || abs(id - _AetherStyleSimpleSurfaceIds.y) < 0.25;
    bool glass = abs(id - _AetherStyleSimpleSurfaceIds.z) < 0.25;
    if (!metal && !glass) return;
    // Simple stylized metal/glass keep their material response without photographic patterns.
    albedo = ApplyVoxTint(metal ? float3(0.22, 0.25, 0.28) : float3(0.7, 0.84, 0.88), tint);
    normal = normalize(worldNorm);
    metallic = metal ? 0.85 : 0.0;
    smoothness = metal ? 0.4 : 0.85;
}

int MaxIdx(float3 v) {
    float a=v.x;
    float b=v.y;
    float c=v.z;
    return a > b ? (a > c ? 0 : 2) : (b > c ? 1 : 2);
}

float mod(float v, float n)
{
	float f = v % n;
	return f < 0 ? f + n : f;
	//return v-n*floor(v/n);
}

float3 ResolveTriplanarPos(float3 worldPos, float3 objectPos, float objectSpaceTexBlend)
{
	return objectSpaceTexBlend > 0.5 ? objectPos : worldPos;
}

float3 WorldToObjectDir(float3 worldDir)
{
	return mul((float3x3)UNITY_MATRIX_I_M, worldDir);
}

float3 ObjectToWorldDir(float3 objectDir)
{
	return mul((float3x3)UNITY_MATRIX_M, objectDir);
}

float3 ResolveTriplanarBlendNorm(float3 worldNorm, float objectSpaceTexBlend)
{
	float3 n = normalize(worldNorm);
	return objectSpaceTexBlend > 0.5 ? normalize(WorldToObjectDir(n)) : n;
}

// GridHintUnit: 0=off, 1=grid, 2=tri wire (showVox), 3=grid+tri
float TriWireHighlight(float3 baryCoord, float strength)
{
	float3 bary = abs(baryCoord);
	float3 baryDx = fwidth(bary);
	float3 edge3 = smoothstep(baryDx * 0.3, baryDx * 0.5, bary);
	return (1.0 - min(min(edge3.x, edge3.y), edge3.z)) * strength;
}

// 蓝图预览等：Opaque 队列 screen-space Bayer 抖动，coverage=1 时不 clip。
// screenPosition：Shader Graph Screen Position 节点（Default，0–1 屏幕 UV）。
// 注意：预览虚影现改用克隆地形材质（_PreviewDitherAlpha=1，无抖动）；此分支仅为兼容保留。
void ApplyPreviewDitherClip(float4 screenPosition, float coverage)
{
	if (coverage >= 0.999)
		return;
#if defined(SHADERGRAPH_PREVIEW)
	return;
#else
	float2 px = screenPosition.xy * _ScreenParams.xy;
	uint index = (uint(px.x) & 3u) * 4u + (uint(px.y) & 3u);
	static const float bayer4[16] = {
		1.0 / 17.0,  9.0 / 17.0,  3.0 / 17.0, 11.0 / 17.0,
		13.0 / 17.0,  5.0 / 17.0, 15.0 / 17.0,  7.0 / 17.0,
		4.0 / 17.0, 12.0 / 17.0,  2.0 / 17.0, 10.0 / 17.0,
		16.0 / 17.0,  8.0 / 17.0, 14.0 / 17.0,  6.0 / 17.0,
	};
	clip(coverage - bayer4[index]);
#endif
}

float CalcGridHighlight(float3 gridPos)
{
	float thickness = 0.01f;
	float dashLen = 0.1f;
	float dashGapLen = 0.1f;
	float gridSpacing = 1.0;
	float3 grid = gridPos / gridSpacing + thickness * 1.01;
	float3 dashT = fmod(abs(grid), dashLen + dashGapLen);
	float3 dashMask = step(dashT, dashLen);
	float3 gridFrac = frac(abs(grid));
	float3 gridLine = step(gridFrac, thickness);
	return (
		gridLine.x * dashMask.z * dashMask.y +
		gridLine.y * dashMask.x * dashMask.z +
		gridLine.z * dashMask.x * dashMask.y) * 0.2;
}

void CalcAtlasTriplanarUV(int TexCap, float TexId, float3 p, out float2 uvX, out float2 uvY, out float2 uvZ)
{
	TexCap = _VoxTexAtlasGrid > 0.0 ? (int)_VoxTexAtlasGrid : TexCap;
	TexId = AetherStyleAtlasTile(TexId);
	TexId += 0.0001f;  // otherwise the floor of TexPosY may -1 at some pixels 
	float TexScale = 1.0 / TexCap;
	float TexPosX  = mod(TexId, TexCap) / TexCap;	
	float TexPosY  = floor(TexId / TexCap) / TexCap;	
	// Each tile contains the COMPLETE repeat plus a cyclic 1/64 gutter (8px at 512).
	// Cropping the source edges then repeating them breaks directional sand/wood patterns.
	float2 origin = float2(TexPosX, TexPosY) + TexScale / 64.0;
	float innerScale = TexScale * (1.0 - 2.0 / 64.0);
	uvX = origin + frac(p.zy) * innerScale;
	uvY = origin + frac(p.xz) * innerScale;
	uvZ = origin + frac(p.xy) * innerScale;
	
}
	
// 图集 mod() 包裹 UV 在 tile 边界的导数尖峰会把自动 mip 选崩（采到整图集平均色 →
// 每 TexScale 米一道灰白条纹/泛白方块）。这里改用相机距离的连续 LOD 显式采样：
// 无屏幕导数、无边界跳变，距离单调 → mip 单调，接缝处永远稳定。
// （tex2Dgrad 方案实机拉丝已回滚；tex2dlod 与本文件 VoxTint 的 SAMPLE_TEXTURE2D_LOD 同族，已验证可用。）
float2 AetherSafeAtlasUv(float2 uv, float lod, float2 texelSize, float grid)
{
    grid = max(1.0, grid);
    float2 tile = floor(uv * grid);
    // Use the actual imported texture resolution, not the source tile size.
    // Trilinear sampling touches ceil(lod), whose half-texel footprint must remain in this tile.
    float2 inset = min(.49, max(1.0 / 64.0, exp2(ceil(lod)) * .5 * texelSize * grid));
    return (tile + clamp(frac(uv * grid), inset, 1.0 - inset)) / grid;
}

float4 AetherAtlasTex2D(UnityTexture2D tex, float2 uv, float3 worldPos)
{
	float dist = distance(_WorldSpaceCameraPos, worldPos);
	// 22.6m 内 lod=0 与原始行为一致（近景全清晰）；远距每翻倍降一级，封顶 3——
	// 只为压制 tile 边界的 mip 尖峰，不可再激进（上一版 /6 导致中景糊成色块）。
	float lod = clamp(log2(max(dist, 1.0)) - 4.5, 0.0, 3.0);
	// Identical world surfaces must choose identical mips on both renderers.
	// A renderer-only mip bias made the near/LOD border remain a texture seam.
	float farLook = max(step(.5, _AetherTerrainOwner), saturate(_AetherFarTerrainLook))
        * step(.5, _AetherTerrainStyleTileCount) * smoothstep(60.0, 180.0, dist);
	if (farLook > 0.0001)
	{
		lod = lerp(lod, clamp(log2(max(dist, 1.0)) - 3.0, 0.0, 4.0), farLook);
		uv = AetherSafeAtlasUv(uv, lod, tex.texelSize.xy, _VoxTexAtlasGrid);
	}
	return tex2Dlod(tex, float4(uv, 0.0, lod));
}

float AetherGroundTileMean(UnityTexture2D tex, float tile, float texCount)
{
    float grid = max(1.0, _VoxTexAtlasGrid > 0 ? _VoxTexAtlasGrid : texCount);
    tile = AetherStyleAtlasTile(tile);
    float2 center = (float2(mod(tile, grid), floor(tile / grid)) + .5) / grid;
    // One texel per atlas tile: sample at its exact center, never an atlas-wide
    // average. This retains each source material's relative texture contrast.
    float mip = max(0.0, floor(log2(max(1.0, tex.texelSize.z / grid))));
    return dot(tex2Dlod(tex, float4(center, 0, mip)).rgb, float3(.2126,.7152,.0722));
}

float AetherGroundDetailFactor(UnityTexture2D tex, float3 ids, float3 weights,
    float texCount, float3 detail)
{
    float mean = AetherGroundTileMean(tex, ids.x, texCount);
    if (ids.x != ids.y || ids.x != ids.z)
        mean = mean * weights.x + AetherGroundTileMean(tex, ids.y, texCount) * weights.y
            + AetherGroundTileMean(tex, ids.z, texCount) * weights.z;
    return clamp(dot(detail, float3(.2126,.7152,.0722)) / max(.02, mean), .35, 2.2);
}

float4 SampleTriplanarTex(UnityTexture2D tex, UnityTexture2D heightTex, float3 p, float TexId, float3 blendWeights, float TexCap, float3 viewDir, float parallaxScale, float3 worldPos) 
{
	float2 uvX, uvY, uvZ;
	CalcAtlasTriplanarUV(TexCap, TexId, p, uvX, uvY, uvZ);

	//SAMPLE_TEXTURE2D(tex, TexSampleState, uvX) * weights.x +
    return AetherAtlasTex2D(tex, uvX, worldPos) * blendWeights.x +
           AetherAtlasTex2D(tex, uvY, worldPos) * blendWeights.y +
           AetherAtlasTex2D(tex, uvZ, worldPos) * blendWeights.z;
}

float3 UnpackNormal(float4 packednormal, float normalStrength)
{
	float3 n = packednormal * 2.0 - 1.0;
	n.xy *= normalStrength;
	return normalize(n);
}
float3 SampleTriplanarTex_Norm(UnityTexture2D tex, float3 p, float TexId, float3 blendWeights, float TexCap, float3 surfaceNorm, float normalStrength, UnityTexture2D heightTex, float3 viewDir, float parallaxScale, float objectSpaceTexBlend, float3 worldPos) 
{
	float2 uvX, uvY, uvZ;
	CalcAtlasTriplanarUV(TexCap, TexId, p, uvX, uvY, uvZ);

	//SAMPLE_TEXTURE2D(tex, TexSampleState, uvX) * weights.x +
	// float3 sampleX = tex2D(tex, uvX) * 2.0f - 1.0f+0.5;
	// float3 sampleY = tex2D(tex, uvY) * 2.0f - 1.0f+0.5;
	// float3 sampleZ = tex2D(tex, uvZ) * 2.0f - 1.0f+0.5;
	float3 sampleX = UnpackNormal(AetherAtlasTex2D(tex, uvX, worldPos), normalStrength);
	float3 sampleY = UnpackNormal(AetherAtlasTex2D(tex, uvY, worldPos), normalStrength);
	float3 sampleZ = UnpackNormal(AetherAtlasTex2D(tex, uvZ, worldPos), normalStrength);

	// Keep Tangent Space, do not need cenvert to WorldSpace
	// sampleX = float3(sampleX.r, sampleX.g, sampleX.b * worldNormal.x);
	// sampleY = float3(sampleY.r * worldNormal.y, sampleY.g, sampleY.b);
	// sampleZ = float3(sampleZ.r, sampleZ.g * worldNormal.z, sampleZ.b);

	// GPU Gems 3, Triplanar Normal Mapping Method.
	float3 n = normalize(
		float3(0., sampleX.y, sampleX.x) * blendWeights.x +
		float3(sampleY.x, 0., sampleY.y) * blendWeights.y +
		float3(sampleZ.xy, 0.)           * blendWeights.z +
		surfaceNorm
	);
	if (objectSpaceTexBlend > 0.5)
		n = normalize(ObjectToWorldDir(n));
	return n;//sampleX * blendWeights.x + sampleY * blendWeights.y + sampleZ * blendWeights.z;
}


// Independent arrays keep the native atlas and saved texture IDs stable.
// 2026-09-18：必须用 Unity 的纹理/采样器**宏**声明。裸 `Texture2DArray x;` + `SamplerState sampler_x;`
// 不会进编辑器的纹理表，`sampler_Mc_color` 就被判定为 Unrecognized sampler —— 于是
// Shader Graphs/TerrainTransparent 的 Fragment 程序编译失败（`Unrecognized sampler 'sampler_mc_color'`），
// 用它的近场透明子网格（水/玻璃 + IsTransparentTex 命中方块）整体回退成洋红错误材质。
// 同一翻译单元里 BKGroundSampling.hlsl 正是用宏写 Texture3D/SAMPLER 才编过的；两处口径统一。
TEXTURE2D_ARRAY(_Mc_color);
TEXTURE2D_ARRAY(_Mc_normal);
TEXTURE2D_ARRAY(_Mc_roughness);
SAMPLER(sampler_Mc_color);
Texture2D<float4> _McBlockColor;
Texture2D<float4> _McBlockInfo;
float _McBlockBase, _McBlockCount;

bool SampleMcBlock(float id, float3 p, float3 n, UnityTexture2D diffuseTex, UnityTexture2D normalTex,
    UnityTexture2D dramTex, float texCount, float texScale, float3 worldPos, out float3 albedo, out float3 normal,
    out float metallic, out float smoothness, out float3 emission, out float ao)
{
    albedo = 0; normal = n; metallic = 0; smoothness = 0; emission = 0; ao = 1;
    int index = (int)round(abs(id) - _McBlockBase);
    if (_McBlockCount < 1 || index < 0 || index >= (int)_McBlockCount) return false;
    float4 info = _McBlockInfo.Load(int3(index, 0, 0));
    float3 tint = _McBlockColor.Load(int3(index, 0, 0)).rgb;
    float3 weights = pow(abs(n), 8);
    weights /= max(dot(weights, 1.0), 0.0001);
    if (_AetherTerrainStyleTileCount > 0.0)
    {
        int family = clamp((int)round(info.x), 0, 5);
        float tile = _AetherStyleMcTiles[family / 4][family % 4];
        float3 scaled = p / max(texScale, 0.001);
        float3 view = normalize(_WorldSpaceCameraPos - worldPos);
        albedo = SampleTriplanarTex(diffuseTex, dramTex, scaled, tile, weights, texCount, view, 0, worldPos).rgb;
        float4 dram = SampleTriplanarTex(dramTex, dramTex, scaled, tile, weights, texCount, view, 0, worldPos);
        normal = SampleTriplanarTex_Norm(normalTex, scaled, tile, weights, texCount, n, 0.5, dramTex, view, 0, 0, worldPos);
        smoothness = min(1.0 - dram.y, 0.35);
        if (family == 3) { albedo = float3(0.22, 0.25, 0.28); normal = n; metallic = 0.85; smoothness = 0.4; }
        float luma = dot(albedo, float3(.2126, .7152, .0722));
        albedo = info.w > .5 ? albedo : tint * clamp(.8 + luma * .4, .8, 1.2);
        if (info.z > .5) { albedo = tint; normal = n; smoothness = .75; metallic = 0; }
        emission = albedo * info.y * 2;
        return true;
    }
    float3 a = _Mc_color.Sample(sampler_Mc_color, float3(p.zy, info.x)).rgb * weights.x
        + _Mc_color.Sample(sampler_Mc_color, float3(p.xz, info.x)).rgb * weights.y
        + _Mc_color.Sample(sampler_Mc_color, float3(p.xy, info.x)).rgb * weights.z;
    float rough = _Mc_roughness.Sample(sampler_Mc_color, float3(p.zy, info.x)).r * weights.x
        + _Mc_roughness.Sample(sampler_Mc_color, float3(p.xz, info.x)).r * weights.y
        + _Mc_roughness.Sample(sampler_Mc_color, float3(p.xy, info.x)).r * weights.z;
    float3 nx = _Mc_normal.Sample(sampler_Mc_color, float3(p.zy, info.x)).xyz * 2 - 1;
    float3 ny = _Mc_normal.Sample(sampler_Mc_color, float3(p.xz, info.x)).xyz * 2 - 1;
    float3 nz = _Mc_normal.Sample(sampler_Mc_color, float3(p.xy, info.x)).xyz * 2 - 1;
    float3 detail = float3(0, nx.y, nx.x) * weights.x + float3(ny.x, 0, ny.y) * weights.y
        + float3(nz.x, nz.y, 0) * weights.z;
    normal = normalize(n + detail * .25);
    float luma = dot(a, float3(.2126, .7152, .0722));
    albedo = info.w > .5 ? a : tint * clamp(.65 + luma * .7, .65, 1.2);
    smoothness = min(1 - rough, .35);
    metallic = info.x == 3 ? .55 : 0;
    if (info.z > .5) { albedo = tint; normal = n; smoothness = .75; metallic = 0; }
    emission = albedo * info.y * 2;
    return true;
}

#include "BKGroundSampling.hlsl"

void TexBlend_float(
	float3 TexIds,  // Vertex Material Id, corresponding to BaryCoord
	float3 WorldPos,
	float3 ObjectPos,
	float3 WorldNorm,
	float3 BaryCoord,
	UnityTexture2D TexDiffuse,
	UnityTexture2D TexNormal,
	UnityTexture2D TexDRAM,  // DRAM: Displacement,Roughness,AO,Metal 
	UnitySamplerState TexSamplerState,
	float TexScale,
	float TexCount,
	float TriplanarBlendPow,
	float HeightmapBlendPow, 
	float TexIdOffset,
	float NormSharpness,
	float ParallaxScale,
	float4 HighlightPosRadius,
	float GridHintUnit,
	float ObjectSpaceTexBlend,
	float PreviewDitherAlpha,
	float4 ScreenPosition,

	out float3 outAlbedo,
	out float3 outNormal, 
	out float outMetallic,
	out float outSmoothness,
	out float3 outEmission,
	out float outAO)
{
	float3 triplanarPos = ResolveTriplanarPos(WorldPos, ObjectPos, ObjectSpaceTexBlend);
	float3 triplanarBlendNorm = ResolveTriplanarBlendNorm(WorldNorm, ObjectSpaceTexBlend);
    float3 sharedColor, sharedNormal; float4 sharedKinds;
    float3 sharedIds = abs(TexIds) + TexIdOffset;
    bool naturalSurface = _AetherBKGroundEnabled > .5 && ObjectSpaceTexBlend < .5 && TexIdOffset < 0 &&
        min(TexIds.x,min(TexIds.y,TexIds.z)) < 0 &&
        min(AetherBKGroundColor(sharedIds.x).a,min(AetherBKGroundColor(sharedIds.y).a,AetherBKGroundColor(sharedIds.z).a)) > .5;
    float4 groundTint = naturalSurface && _AetherMacroRect.z <= .5
        ? SampleVoxTint(ObjectPos,triplanarBlendNorm,true) : float4(1,1,1,1);
    naturalSurface = naturalSurface && (AetherTargetTint(groundTint) > .5 || min(groundTint.r,min(groundTint.g,groundTint.b)) > .999);
    float sharedWeight = 0;
    if (naturalSurface && WorldNorm.y > .1) sharedWeight = AetherSharedSurface(WorldPos,sharedColor,sharedKinds,sharedNormal);
    if (sharedWeight > 0)
    {
        WorldNorm = normalize(lerp(normalize(WorldNorm),sharedNormal,sharedWeight));
        triplanarBlendNorm = WorldNorm;
    }
    // Both natural paths enter the same material function once, including spatial weights.
    if (naturalSurface)
    {
        float3 weights = pow(abs(normalize(WorldNorm)),TriplanarBlendPow);
        weights /= max(dot(weights,float3(1,1,1)),.0001);
        if (_AetherMacroRect.z > .5)
            groundTint = float4(AetherMacroSurfaceColor(AetherMacroColorUV(WorldPos.xz),WorldPos.y),254.0/255.0);
        if (SampleBKGround(sharedIds,BaryCoord,triplanarPos / max(TexScale,.001),WorldPos,ObjectPos,
            normalize(WorldNorm),weights,normalize(_WorldSpaceCameraPos-WorldPos),TexCount,NormSharpness,
            TexDiffuse,TexNormal,TexDRAM,groundTint,outAlbedo,outNormal,outSmoothness,outAO))
        {
            if (_AetherMacroRect.z <= .5)
            {
                float selectDist = HighlightPosRadius.w - length(WorldPos - HighlightPosRadius.xyz);
                outAlbedo += selectDist > 0 ? (selectDist < .01 ? .4 : .03) : 0;
                if (GridHintUnit == 1 || GridHintUnit == 3) outAlbedo += CalcGridHighlight(triplanarPos);
                if (GridHintUnit == 2 || GridHintUnit == 3) outAlbedo += TriWireHighlight(BaryCoord,.4);
            }
            outMetallic = 0; outEmission = 0;
            ApplyAetherEnvironment(WorldPos,normalize(WorldNorm),outAlbedo,outSmoothness);
            ApplyPreviewDitherClip(ScreenPosition,PreviewDitherAlpha);
            return;
        }
    }
    if (_AetherMacroRect.z > 0.5)
    {
        float2 uv = AetherMacroColorUV(WorldPos.xz);
        float3 ground = AetherMacroSurfaceColor(uv, WorldPos.y);
        outNormal = normalize(WorldNorm);
        outAlbedo = ground;
        // Macro vertices keep signed registry IDs; this branch precedes atlas conversion.
        float3 surfaceTiles = abs(TexIds) + TexIdOffset;
        // Mesa's band color is an explicit target tint on real chunks and density
        // leaves. Use their MC material path on the macro shell as well; the
        // generic ground painter otherwise exposes a second, sandy material
        // whenever coverage switches between those meshes.
        if (_AetherMacroStrataRows > .5 &&
            abs(surfaceTiles.x-surfaceTiles.y) < .25 && abs(surfaceTiles.x-surfaceTiles.z) < .25)
        {
            float geology = SAMPLE_TEXTURE2D_LOD(_AetherMacroColor,sampler_AetherMacroColor,uv,0).a;
            // A non-MC surface can share a geology column. Failed sampling writes
            // zero to its out parameters; it must not erase the macro fallback.
            float3 mcAlbedo, mcNormal, mcEmission;
            float mcMetallic, mcSmoothness, mcAO;
            if (geology > 1.999 &&
                SampleMcBlock(TexIds.x, triplanarPos, triplanarBlendNorm, TexDiffuse, TexNormal,
                    TexDRAM, TexCount, TexScale, WorldPos, mcAlbedo, mcNormal, mcMetallic,
                    mcSmoothness, mcEmission, mcAO))
            {
                outAlbedo = ApplyVoxTint(mcAlbedo, float4(ground,254.0/255.0));
                outNormal = normalize(lerp(mcNormal, normalize(WorldNorm), .75));
                outSmoothness = min(mcSmoothness, .25);
                outMetallic = 0;
                outEmission = mcEmission;
                outAO = max(mcAO, .8);
                ApplyAetherEnvironment(WorldPos, normalize(WorldNorm), outAlbedo, outSmoothness);
                return;
            }
        }
        float3 surfaceWeights = max(BaryCoord, 0.0);
        surfaceWeights /= max(dot(surfaceWeights, float3(1, 1, 1)), .0001);
        float surfaceRock = dot(surfaceWeights, float3(AetherFarRockMask(surfaceTiles.x),
            AetherFarRockMask(surfaceTiles.y), AetherFarRockMask(surfaceTiles.z)));
        float3 surfaceKinds = AetherBKGroundKinds(surfaceTiles, surfaceWeights);
        surfaceRock = AetherNaturalSlopeRock(outNormal, surfaceRock, surfaceKinds.x + surfaceKinds.y);
        float groundWeight = 1.0 - surfaceRock;
        AetherNaturalRockBase(surfaceRock, outAlbedo);
        // A loading shell must still contain the actual ground material. Sample the
        // same world-aligned atlas as detailed terrain, with stable mip filtering.
        float3 macroBlend = pow(abs(outNormal), max(1.0, TriplanarBlendPow));
        macroBlend /= max(dot(macroBlend, float3(1,1,1)), .0001);
        float3 macroView = normalize(_WorldSpaceCameraPos - WorldPos);
        float3 macroPos = WorldPos / max(TexScale, .001);
        float3 macroDetail = SampleTriplanarTex(TexDiffuse, TexDRAM, macroPos, surfaceTiles.x,
            macroBlend, TexCount, macroView, 0, WorldPos).rgb * surfaceWeights.x
            + SampleTriplanarTex(TexDiffuse, TexDRAM, macroPos, surfaceTiles.y,
            macroBlend, TexCount, macroView, 0, WorldPos).rgb * surfaceWeights.y
            + SampleTriplanarTex(TexDiffuse, TexDRAM, macroPos, surfaceTiles.z,
            macroBlend, TexCount, macroView, 0, WorldPos).rgb * surfaceWeights.z;
        float3 macroNormal = SampleTriplanarTex_Norm(TexNormal, macroPos, surfaceTiles.x,
            macroBlend, TexCount, outNormal, NormSharpness, TexDRAM, macroView, 0, 0, WorldPos) * surfaceWeights.x
            + SampleTriplanarTex_Norm(TexNormal, macroPos, surfaceTiles.y,
            macroBlend, TexCount, outNormal, NormSharpness, TexDRAM, macroView, 0, 0, WorldPos) * surfaceWeights.y
            + SampleTriplanarTex_Norm(TexNormal, macroPos, surfaceTiles.z,
            macroBlend, TexCount, outNormal, NormSharpness, TexDRAM, macroView, 0, 0, WorldPos) * surfaceWeights.z;
        ApplyAetherLandscapePaint(WorldPos, outNormal, surfaceRock, outAlbedo);
        ApplyAetherGroundPaint(WorldPos, distance(_WorldSpaceCameraPos, WorldPos),
            _AetherFarTerrainLook * groundWeight, surfaceKinds, outAlbedo);
        float3 geometryNormal = outNormal;
        AetherGroundSurfaceDetail(AetherGroundDetailFactor(TexDiffuse, surfaceTiles, surfaceWeights, TexCount, macroDetail),
            surfaceRock, geometryNormal, macroNormal, outAlbedo, outNormal);
        outMetallic = 0; outSmoothness = .12; outEmission = 0; outAO = 1;
        ApplyAetherEnvironment(WorldPos, geometryNormal, outAlbedo, outSmoothness);
        return;
    }
    if (TexIdOffset < 0 && SampleMcBlock(TexIds.x, triplanarPos, triplanarBlendNorm,
        TexDiffuse, TexNormal, TexDRAM, TexCount, TexScale, WorldPos,
        outAlbedo, outNormal, outMetallic, outSmoothness, outEmission, outAO))
    {
        outAlbedo = ApplyVoxTint(outAlbedo, SampleVoxTint(ObjectPos, triplanarBlendNorm, TexIds.x < 0));
        outNormal = ObjectSpaceTexBlend > .5 ? normalize(mul((float3x3)UNITY_MATRIX_M, outNormal)) : outNormal;
        ApplyAetherEnvironment(WorldPos, normalize(WorldNorm), outAlbedo, outSmoothness);
        ApplyPreviewDitherClip(ScreenPosition, PreviewDitherAlpha);
        return;
    }


    float3 TriplanarBlendWeights = pow(abs(triplanarBlendNorm), TriplanarBlendPow);
    TriplanarBlendWeights /= dot(TriplanarBlendWeights, 1.0);  // make sure the weights sum up to 1 (divide by sum of x+y+z)

	// 等值面网格 UV.x 为 -texId（见 SurfaceNetsJob / MarchingCubesJob）
	bool isIsoSurface = min(min(TexIds.x, TexIds.y), TexIds.z) < 0.0;
	TexIds = abs(TexIds);

	TexIds += TexIdOffset;
	if (TexIdOffset >= 0)
		TexIds = TexIdOffset;

	float3 viewDir = normalize(_WorldSpaceCameraPos  - WorldPos);

	float3 posTexScaled = triplanarPos / TexScale;


	// DRAM of 3 vertices of the triangle
	float4 triDRAM[3] = { 
		SampleTriplanarTex(TexDRAM,TexDRAM, posTexScaled, TexIds[0], TriplanarBlendWeights, TexCount, viewDir, ParallaxScale, WorldPos),
		SampleTriplanarTex(TexDRAM,TexDRAM, posTexScaled, TexIds[1], TriplanarBlendWeights, TexCount, viewDir, ParallaxScale, WorldPos),
		SampleTriplanarTex(TexDRAM,TexDRAM, posTexScaled, TexIds[2], TriplanarBlendWeights, TexCount, viewDir, ParallaxScale, WorldPos),
	};
	
	float3 _bhm = pow(abs(BaryCoord), HeightmapBlendPow);  // HeightmapBlendWeights. Pow: littler=mix, greater=distinct, opt 0.3 - 0.6, 0.48 = nature
	int HighestDispTriVertexIndex = MaxIdx(float3(triDRAM[0].x * _bhm.x, triDRAM[1].x * _bhm.y, triDRAM[2].x * _bhm.z));
	// int idxVertTex = idxMaxHigh;  // triangle vertex idx of Current Frag Mtl. usually = i_MaxBary, or i_MaxHigh

	float4 DRAM = triDRAM[HighestDispTriVertexIndex];
	float farLook = AetherFarLookWeight(WorldPos);
	// Smooth world terrain at every distance, including atlas fallback when BK's
	// natural-color field does not apply. Local volumes and explicit tiles keep their path.
	float surfaceBlend = isIsoSurface && ObjectSpaceTexBlend < 0.5 && TexIdOffset < 0 ? 1.0 : farLook;
	float3 surfaceWeights = max(BaryCoord, 0.0);
	surfaceWeights /= max(dot(surfaceWeights, float3(1, 1, 1)), 0.0001);
	if (surfaceBlend > 0.0001)
		DRAM = lerp(DRAM, triDRAM[0] * surfaceWeights.x + triDRAM[1] * surfaceWeights.y
			+ triDRAM[2] * surfaceWeights.z, surfaceBlend);

	float selectDist = HighlightPosRadius.w - length(WorldPos - HighlightPosRadius.xyz);
	float highlightDist = selectDist > 0 ? (selectDist < 0.01 ? 0.4 : 0.03) : 0;

    if (GridHintUnit == 1 || GridHintUnit == 3)
    	highlightDist += CalcGridHighlight(triplanarPos);
    if (GridHintUnit == 2 || GridHintUnit == 3)
    	highlightDist += TriWireHighlight(BaryCoord, 0.4);

	outAlbedo = 
	SampleTriplanarTex(TexDiffuse,TexDRAM, posTexScaled, TexIds[HighestDispTriVertexIndex], TriplanarBlendWeights, TexCount, viewDir, ParallaxScale, WorldPos).xyz  + highlightDist;// * float3(53/255.0f, 116/255.0f,240/255.0f);
	// Terrain triangles must not turn material IDs into hard polygon-shaped color patches.
	// Interpolate the same sampled surfaces across shared edges; do not invent biome colors.
	if (surfaceBlend > 0.0001 && (TexIds.x != TexIds.y || TexIds.x != TexIds.z))
	{
		float3 blended = SampleTriplanarTex(TexDiffuse, TexDRAM, posTexScaled, TexIds.x, TriplanarBlendWeights, TexCount, viewDir, ParallaxScale, WorldPos).rgb * surfaceWeights.x
			+ SampleTriplanarTex(TexDiffuse, TexDRAM, posTexScaled, TexIds.y, TriplanarBlendWeights, TexCount, viewDir, ParallaxScale, WorldPos).rgb * surfaceWeights.y
			+ SampleTriplanarTex(TexDiffuse, TexDRAM, posTexScaled, TexIds.z, TriplanarBlendWeights, TexCount, viewDir, ParallaxScale, WorldPos).rgb * surfaceWeights.z;
		outAlbedo = lerp(outAlbedo, blended + highlightDist, surfaceBlend);
	}
	float4 voxTint = SampleVoxTint(ObjectPos, triplanarBlendNorm, isIsoSurface);
	outAlbedo = ApplyVoxTint(outAlbedo, voxTint);
					 
	outNormal = SampleTriplanarTex_Norm(TexNormal, posTexScaled, TexIds[HighestDispTriVertexIndex], TriplanarBlendWeights, TexCount, triplanarBlendNorm, NormSharpness,
		TexDRAM, viewDir, ParallaxScale, ObjectSpaceTexBlend, WorldPos);
	if (surfaceBlend > 0.0001 && (TexIds.x != TexIds.y || TexIds.x != TexIds.z))
	{
		float3 blendedNormal = SampleTriplanarTex_Norm(TexNormal, posTexScaled, TexIds.x, TriplanarBlendWeights, TexCount, triplanarBlendNorm, NormSharpness,
			TexDRAM, viewDir, ParallaxScale, ObjectSpaceTexBlend, WorldPos) * surfaceWeights.x
			+ SampleTriplanarTex_Norm(TexNormal, posTexScaled, TexIds.y, TriplanarBlendWeights, TexCount, triplanarBlendNorm, NormSharpness,
				TexDRAM, viewDir, ParallaxScale, ObjectSpaceTexBlend, WorldPos) * surfaceWeights.y
			+ SampleTriplanarTex_Norm(TexNormal, posTexScaled, TexIds.z, TriplanarBlendWeights, TexCount, triplanarBlendNorm, NormSharpness,
				TexDRAM, viewDir, ParallaxScale, ObjectSpaceTexBlend, WorldPos) * surfaceWeights.z;
		outNormal = normalize(lerp(outNormal, blendedNormal, surfaceBlend));
	}

	// outAlbedo = float3(1,1,1) * 0.3;
	// outNormal = normalize(float3(0,0,1));

	// outAlbedo = outNormal;//(outNormal + 1) / 2.0; outNormal = float3(0,0,1);
	// outNormal = WorldNorm;

	outEmission = 0;
	outSmoothness = 1.0 - DRAM.y;
	// 贴图 AO 只描述材质微遮蔽，不能把大型动态建筑的天空/SSGI 间接光完全吃掉。
	outAO = lerp(saturate(_AetherTerrainAoFloor), 1.0, DRAM.z);
	outMetallic = DRAM.w;
	ApplyAetherSimpleStyle(TexIds[HighestDispTriVertexIndex], voxTint, WorldNorm, outAlbedo, outNormal, outMetallic, outSmoothness);
	// Imported architectural target colors use a matte base, independent of an iron/dirt fallback.
	float targetTint = AetherTargetTint(voxTint);
	outNormal = normalize(lerp(outNormal, normalize(WorldNorm), targetTint * 0.75));
	outSmoothness = lerp(outSmoothness, min(outSmoothness, 0.25), targetTint);
	outMetallic *= 1.0 - targetTint;
	outAO = lerp(outAO, max(outAO, 0.8), targetTint);
	ApplyAetherEnvironment(WorldPos, normalize(WorldNorm), outAlbedo, outSmoothness);
	ApplyAetherMaterialNpr(TexIds[HighestDispTriVertexIndex], normalize(WorldNorm), outAlbedo, outNormal, outSmoothness, outMetallic);
	if (farLook > 0.0001)
	{
		outNormal = normalize(lerp(outNormal, normalize(WorldNorm), farLook * .7));
		float rockCoverage = dot(surfaceWeights, float3(AetherFarRockMask(TexIds.x),
			AetherFarRockMask(TexIds.y), AetherFarRockMask(TexIds.z)));
		ApplyAetherFarRock(rockCoverage, WorldPos, normalize(WorldNorm), outAlbedo, outNormal, outSmoothness);
	}

	ApplyPreviewDitherClip(ScreenPosition, PreviewDitherAlpha);
}

void TexBlendTransparent_float(
	float3 TexIds,
	float3 WorldPos,
	float3 ObjectPos,
	float3 WorldNorm,
	float3 BaryCoord,
	UnityTexture2D TexDiffuse,
	UnityTexture2D TexNormal,
	UnityTexture2D TexDRAM,
	UnitySamplerState TexSamplerState,
	float TexScale,
	float TexCount,
	float TriplanarBlendPow,
	float HeightmapBlendPow,
	float TexIdOffset,
	float NormSharpness,
	float ParallaxScale,
	float4 HighlightPosRadius,
	float GridHintUnit,
	float AlphaScale,
	float ObjectSpaceTexBlend,

	out float3 outAlbedo,
	out float3 outNormal,
	out float outMetallic,
	out float outSmoothness,
	out float3 outEmission,
	out float outAO,
	out float outAlpha)
{
	float3 triplanarPos = ResolveTriplanarPos(WorldPos, ObjectPos, ObjectSpaceTexBlend);
	float3 triplanarBlendNorm = ResolveTriplanarBlendNorm(WorldNorm, ObjectSpaceTexBlend);
    if (TexIdOffset < 0 && SampleMcBlock(TexIds.x, triplanarPos, triplanarBlendNorm,
        TexDiffuse, TexNormal, TexDRAM, TexCount, TexScale, WorldPos,
        outAlbedo, outNormal, outMetallic, outSmoothness, outEmission, outAO))
    {
        outAlbedo = ApplyVoxTint(outAlbedo, SampleVoxTint(ObjectPos, triplanarBlendNorm, TexIds.x < 0));
        outNormal = ObjectSpaceTexBlend > .5 ? normalize(mul((float3x3)UNITY_MATRIX_M, outNormal)) : outNormal;
        ApplyAetherEnvironment(WorldPos, normalize(WorldNorm), outAlbedo, outSmoothness);
        outAlpha = .35;
        return;
    }


	float3 triplanarBlendWeights = pow(abs(triplanarBlendNorm), TriplanarBlendPow);
	triplanarBlendWeights /= dot(triplanarBlendWeights, 1.0);

	bool isIsoSurface = min(min(TexIds.x, TexIds.y), TexIds.z) < 0.0;
	float3 texIds = abs(TexIds) + TexIdOffset;
	if (TexIdOffset >= 0)
		texIds = TexIdOffset;

	float3 viewDir = normalize(_WorldSpaceCameraPos - WorldPos);
	float3 posTexScaled = triplanarPos / TexScale;

	float4 triDRAM[3] = {
		SampleTriplanarTex(TexDRAM, TexDRAM, posTexScaled, texIds[0], triplanarBlendWeights, TexCount, viewDir, ParallaxScale, WorldPos),
		SampleTriplanarTex(TexDRAM, TexDRAM, posTexScaled, texIds[1], triplanarBlendWeights, TexCount, viewDir, ParallaxScale, WorldPos),
		SampleTriplanarTex(TexDRAM, TexDRAM, posTexScaled, texIds[2], triplanarBlendWeights, TexCount, viewDir, ParallaxScale, WorldPos),
	};

	float3 bhm = pow(abs(BaryCoord), HeightmapBlendPow);
	int highestDispTriVertexIndex = MaxIdx(float3(triDRAM[0].x * bhm.x, triDRAM[1].x * bhm.y, triDRAM[2].x * bhm.z));

	float4 DRAM = triDRAM[highestDispTriVertexIndex];

	float selectDist = HighlightPosRadius.w - length(WorldPos - HighlightPosRadius.xyz);
	float highlightDist = selectDist > 0 ? (selectDist < 0.01 ? 0.4 : 0.03) : 0;

	if (GridHintUnit == 1 || GridHintUnit == 3)
		highlightDist += CalcGridHighlight(triplanarPos);
	if (GridHintUnit == 2 || GridHintUnit == 3)
		highlightDist += TriWireHighlight(BaryCoord, 0.12);

	float4 diffuse = SampleTriplanarTex(
		TexDiffuse, TexDRAM, posTexScaled, texIds[highestDispTriVertexIndex],
		triplanarBlendWeights, TexCount, viewDir, ParallaxScale, WorldPos);

	float curve = AlphaScale > 0.0 ? AlphaScale : 2.0;
	float alpha = saturate(diffuse.w);

	outAlbedo = diffuse.xyz + highlightDist;
	outAlbedo = ApplyVoxTint(outAlbedo, SampleVoxTint(ObjectPos, triplanarBlendNorm, isIsoSurface));
	outNormal = SampleTriplanarTex_Norm(
		TexNormal, posTexScaled, texIds[highestDispTriVertexIndex], triplanarBlendWeights, TexCount, triplanarBlendNorm, NormSharpness,
		TexDRAM, viewDir, ParallaxScale, ObjectSpaceTexBlend, WorldPos);
	outEmission = 0;
	// 透明层：高光/金属度随 Alpha 衰减，避免玻璃看起来像镜面不透明板
	outSmoothness = (1.0 - DRAM.y) * alpha;
	outAO = DRAM.z;
	outMetallic = DRAM.w * alpha;
	outAlpha = pow(alpha, curve);
	ApplyAetherSimpleStyle(texIds[highestDispTriVertexIndex], SampleVoxTint(ObjectPos, triplanarBlendNorm, isIsoSurface), WorldNorm,
		outAlbedo, outNormal, outMetallic, outSmoothness);
	if (_AetherTerrainStyleTileCount > 0 && abs(texIds[highestDispTriVertexIndex] + 1.0 - _AetherStyleSimpleSurfaceIds.z) < 0.25)
		outAlpha = 0.22;
}
