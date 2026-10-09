# oak_fence v02 独立几何与视觉验收

审查日期：2026-10-07 UTC。对象：west + east 相连的 oak_fence 代表样例及同格 60 三角盒组合备选。只读现有文件与图片；没有启动 Blender、Unity、设备、本机任务或 Codex，没有改源或重新渲染。

同日新增 16 态接触图、world-phase 示例及 v05 stone_brick_stairs 代表合审，见报告末尾追加证据。第一轮的 not_run 记录是当时状态；新增证据仅在明示范围内更新它。

## 结论

**整体仍是 candidate，可以保留为离线视觉技术样例；不能计为一个全状态 accepted block。** 本次对代表样例的真实导出几何、母版对照、纹理方向和已有预览取得了独立证据。16 态全视觉、最新版本引擎接入、碰撞、区块边界和手机表现仍未成立。`mobile_pass = false`，全状态 accepted 贡献数量为 0，运行时表示方案未选定。

代表样例没有发现需要丢弃的轮廓、意外封口、破面或 UV 转向硬伤。它的技术通过范围仅为当前离线代表文件，不能外推为其他状态或真机的通过。材质 A 的木头独立审查不由这次几何审查替代。

## 独立证据与明确门限

可复现轻量审计：`oak_fence_readonly_audit.py`，结果为 `oak_fence_v02_independent_audit.json`。脚本独立解析 FBX/GLB 二进制，并按历史 C# 中的尺寸手工建立预期盒集合；没有导入 builder 的生成函数。

代表 exact-union 的必要技术门：

- Unity 坐标格内，米制、格角 origin，west/east 延伸到 x=0/1，整体 `[0,0,0.375]` 到 `[1,1,0.625]`
- 必须与预期盒 union 的面积 2.25 m²、体积 0.109375 m³ 相符；数值容差 1e-8
- 三角零退化，坐标焊接后所有边双邻接且绕序相反，存储法线与外向三角法线相符
- 每三角 55 个内部重心网格点，向法线内/外偏移 1e-5 m 后分别落入/离开预期实体；此采样辅证不能代替整个渲染/碰撞过程
- 一 mesh、一 primitive/材质、一 review UV0，opaque，闭壳不依赖双面渲染
- review UV 按 2 m 周期投影，柱纵向、横梁横向；UV 转向验证容差 1e-6

实际 candidate GLB：84 三角、132 序列化属性顶点、44 坐标焊接点；面积/体积完全相符；退化、非双邻接边、绕序异常、法线异常均为 0；4,620 个边界样本异常 0，方向 UV 检查失败 0。节点没有平移/旋转/缩放。UV0 的实际 glTF 范围为 U=0.1875–0.5、V=0.5–1.0，V 与 Blender UV 反向是 glTF 导出约定，没有错认其范围。

独立读取 FBX：

| 文件 | 三角 | 本地 mesh 点 | 面积 m² | 体积 m³ | 坐标焊接非双邻接边 |
|---|---:|---:|---:|---:|---:|
| master | 288 | 146 | 2.25 | 0.109375 | 0 |
| reduced candidate | 84 | 44 | 2.25 | 0.109375 | 0 |
| BOX_COMBO comparison | 60 | 40 | 2.875 | 0.125 | 8 |

FBX master 两套 UV（review + 解释用 texId），candidate 一套 review UV。FBX 采用厘米标记及 mesh object 100 倍缩放、X 轴约 -90° 旋转；离线规范化后与 canonical geometry 相符，仍没有声称 Unity importer 已验。

实际 source `.blend` 只读解压后的 header 为 BLENDER-v403，找到 MASTER、OPT、BOX_COMBO_60 及两种 UV 的名称，且找到完整、逐字节一致的共享木 basecolor PNG。该证据证明 packed image 与对象名存在；没有独立操作源文件来验证编辑流程或对象隐藏状态。

## 真实查看的五张图片

五张 640×640 PNG 均已逐张使用 image viewer 查看，并独立检查其与 v01 同名图像逐像素一致：

- `oak_fence_master_geometry.png`：中央方柱、两层横梁、左右开口与柱脚清楚；梁顶/侧向结构未被木纹掩盖
- `oak_fence_optimized_geometry.png`：母/减轮廓、梁厚、开口与纹理分区一致，没有视觉上可见的收缩或封口。独立同图差分 MAD=0.00002197265625 RGB255，仅 2 像素任一通道差超过 2
- `oak_fence_optimized_mobile256.png`：当前尺寸的低频木纹、梁间空隙仍可辨；这只能支持该 640px 预览中的 256 贴图损失可接受，不能证明手机纹理压缩、mip 或远景表现
- `oak_fence_back_low.png`：背面的两梁、柱边和左右开口仍成立；没有看到穿帮背面或消失横梁
- `oak_fence_clay.png`：无纹理时矩形比例、梁厚与开口保留；背景/物体对比偏低，且有低采样噪点，细小问题的视觉检出能力有限

这五图是**两个相机角度**上的母/减/纹理分辨率/材质变化，不是五个不同方位。所谓 back_low 相机仍在目标上方，不能当作底面实拍。底面闭合和外向绕序的结论来自文件几何审计。

木纹在柱侧沿高度、在横梁侧沿跨度，符合可读的木制构件意图。该简化共享纹理没有独立物理端面年轮；本次未将此作为轮廓硬伤，但不能把它描述为写实木工材质。预览的柔光和非原生 Toon 替代 shader 也不能代表游戏内美术效果。

## 历史语义对照

直接读 supplied historical `0956b077` 的 `ChunkMeshGenerator.cs` PutFence、`Vox.cs` ConnectsToFence 和 shape registry：

- shapeId=11；Cube=1、Wall=4
- 中柱 x/z=0.375–0.625，高 y=0–1；柱截面 0.25×0.25 m
- 横梁深 0.125 m，厚/高 0.25 m，y=0.375–0.625 与 0.75–1
- 代表 west/east 状态分别沿 -X/+X 从中心伸向格边；梁间 y=0.625–0.75 的 0.125 m 开口保留，柱两侧 y=0–0.375 空间保留
- south=+Z、west=-X、north=-Z、east=+X；实际邻居决定连接，predicate 为 texId 非空且邻居 Fence/Cube/Wall
- 16 mask 是审查 fixture，不是 persisted metadata；当前 fence source 不把 open、up、facing 位解释为连接态
- opaque native path 未传入 occlusion callback，历史 PutSolidBox 会发完整重叠盒，不是 clean exterior union

当前输出的形体与该历史源语义相符，不等于已证明用户最新代码仍一致。texId=33 / atlas tile=32 由 supplied mapping 与共享资源记录提供；本次没有重新审查整个 BK 材质 catalog。

## 优化比较必须诚实

288→84 的 70.83% 是**新建 authoring-grid 母版**减面量；原生代表盒组合为 60 三角，所以 clean union 84 比其多 40%，不能称为原生 triangle 优化。四向状态报告的 160 相对原生 108 多约 48.15%。清除相交内面与减少三角不是同一门，手机收益未知。

BOX_COMBO 的 60 三角可保留为比较备选，不宜按 clean union 门判 pass：它是五个各自闭合的相交盒。坐标焊接后 8 条非双邻接边、3,300 个边界采样中 764 个不属于正确外壳，正好体现内部/重复相交表面；组件体积和表面积不能当物理 union 值。这不否认 builder 在独立组件拓扑上的 manifold=0异常数据，但二者范围不同。

真实 GLB 序列化 mesh accessor（不含 PNG/容器/GPU 对齐）：

- exact union：132 属性顶点 × 32 B + 252 uint16 index × 2 B = 4,728 B
- BOX_COMBO：实际 120 属性顶点 × 32 B + 180 uint16 index × 2 B = 4,200 B；104 是潜在属性去重估算，不能替代实际导出值
- candidate v01 的 Position/Normal/UV0/index 与当前逐值完全相同；仅去掉解释性 TEXCOORD_1，将 accessor 5,784→4,728 B，减少 1,056 B。五图逐像素不变

不能据此估算 native chunk 的显存、draw call、能耗或帧率。2m world-repeat 也不是 UV1 删除带来的 runtime 功能。

## 本轮发现、修正与未通过范围

初读 candidate/BOX GLB 时材质 `doubleSided=true`。已立即反馈 builder；builder 修正后，本审查重新读取实际文件，字段已移除，按 glTF 默认值为 false。opaque alphaMode 也采用默认 OPAQUE；单材质、同一共享 PNG、Position/Normal/UV0/index 保持不变。该导出风险已关闭，但不证明 Unity 具体 shader 的 Cull 设置。

修后文件 fingerprint：

- candidate GLB：`bb83112776789b5ac2d9000046f2729df0bfd66eff1cbaafa15aeb7c23c92bdc`
- BOX_COMBO GLB：`f6f25fe2425195c972435d398d8baf94439603280a19362e7e9a0d9821c5782c`
- 共享 packed basecolor：`3ef497d9c74f42db633f9434d4593c3b5b0a65f6044c093efe9cb3f174b24031`

仍阻止 block 全状态/移动端 accepted 的事项：

1. supplied 58 cases 是历史源 Python 转录与派生 Blender geometry 的结果，不是执行 C#。本次独立核对 fence 16 行面积/体积/方向 bounds 均一致，但只有 west/east 代表 mesh 和五图被真实独立检查；其他态 visual_state_review 仍是 not_run
2. 当前 review UV 是格内局部坐标。东西两端沿梁方向相位差半个 tile；直接重复 imported mesh 到下一 cell 会把相位重置。五张单块图不证明相邻梁纹理连续。未来 consumer 必须保留绝对 world offset 的 repeat 相位，再验证直线、转角、T、四向多块排列
3. 历史 native chunk UV0=(texId,0)，world triplanar，不能直接消费上述分构件定向 UV。UV/atlas/tint 的 native adaptation 未做
4. 没有最新代码验证、跨 chunk 邻居 load/unload/edit 失效传播、partial coverage 互遮挡、碰撞一致性、引擎导入/原生渲染检查
5. 没有 Android/iOS 压缩、mip、实际视距、手机 GPU/CPU frame-time、内存/发热数据；84/160 对 60/108 的两种表示尚不能选择

后续最小验收范围是：适配后的 16 连接态与典型多块拼接画面、闭壳 backface-cull/native shader 检查、区块边界变更和碰撞，然后在同材质/相同场景下对 union 与 native box 表示做手机对照。石头 failed/blocked 材质未评；其他 stair/slab 不在本报告的独立视觉验收范围。

## 同日追加一：fence 16 派生态单角度与实际 baked UV 示例

**新增可关闭范围：16 个派生连接态已在一张相同上方斜视图中独立看过；参考源文件中的显式 world-offset + 构件方向 UV 已独立验证。** 全角度/native/mobile 的门仍未关闭，整体 candidate、full-state accepted=0 的结论不变。

新增实际查看：

- `previews/oak_fence_connection16_contact.png`，1280×1390。16 个标注从 0000 到 1111，孤柱、单臂、直线、转角、T 和四向形态可辨；两层梁和开口保留，柱纵向/梁沿构件的木纹可读，没有发现新的可见轮廓或封口缺陷。反向遮挡的梁仍需要其他方位检查；此图不能证明背面、底面或实邻居解析
- `previews/oak_fence_phase_comparison.png`，1280×1060。上行显示单格纹理局部重置，中行展示显式逻辑世界位移后的纹理相位，第三行展示投影规则近似导致横梁木纹纵向。三行是参考 bake 的比较，不是运行原生 HLSL；图中单元界仍能见细线，不可将算式相位相符描述为所有几何接缝已解决

新增独立读取：`blend_readonly_reader.py` 直接解码 `.blend` 的 4.03 little-endian SDNA、Mesh 坐标/面角/UV；没有调用 Blender。独立结果在 `fence_states_stairs_independent_audit.json`，可复现脚本为 `fence_states_stairs_readonly_audit.py`。

参考 `.blend` 的 16 个真实 STATE mesh 已逐个独立核对：

- 格内 bounds、方向延伸、面积 `1.125 + 0.5625 × 臂数`、体积 `0.0625 + 0.0234375 × 臂数` 全部相符
- 坐标焊接非双邻接边、边绕序异常、非轴向多边形均为 0；每 mesh 一材质和一套 review UV
- 2,240 个存储 face-loop UV 与独立方向/世界相位算式匹配，失败 0
- n-gon 面积分采用有向 Newell/polygon 积分，避免把凹面 fan 三角全部正面积累加造成误报；本次没有重新执行 renderer 的 triangulation

| mask（S/W/N/E 位） | 三角数（polygon n−2） | mask | 三角数 |
|---|---:|---|---:|
| 0000 | 12 | 1000 | 48 |
| 0001 | 50 | 1001 | 86 |
| 0010 | 48 | 1010 | 84 |
| 0011 | 86 | 1011 | 122 |
| 0100 | 50 | 1100 | 86 |
| 0101 | 88 | 1101 | 124 |
| 0110 | 86 | 1110 | 122 |
| 0111 | 124 | 1111 | 160 |

相反方向的三角数有 50/48、88/84 等差异，面积/体积与方向对称性仍相符。这是当前 UV/溶边后 tessellation 的差异，不能据此虚构方向无关的统一性能。

phase 示例的 12 个真实 chain mesh、1,332 个存储 loop UV 也全部按其逻辑原点和模式相符。独立复算提供的 24 项 arithmetic samples，与 JSON 完全一致：world-offset error=0、local-reset error=0.5。这 24 项含中心线/非实际面上的高度点，只能称算式样本。

为避免把算式当 mesh 接缝，本审查额外对真实存储 UV 做了实际表面配对：沿 X 的四 cell chain 有 3 个物理连接边界，每边界排除相向 end caps 后匹配 16 对 side/top/bottom face-loop 点。

| reference 模式 | 每 3 接缝 × 16 表面配对的 UV 差 |
|---|---:|
| cell-local reset | 所有配对均 0.5 |
| 显式 world-offset + part-direction | 所有配对均 0 |
| native projection-rule approximation | 所有配对均 0，但横梁 grain 方向未改变 |

另做 28 项负原点及类区块原点（-33、-2、-1、0、1、31、32，X/Z 两向）参考算式检查，最大相位误差 0。它没有测试 chunk accessor、origin rebasing、float 精度或 native buffer。Z 向实体链、转角/T/四向相接尚没有本轮同级真实 loop 配对证据。

source 中完整共享木 PNG 字节仍与原木纹资源一致，新增 reference 不改变原 84/60 的候选导出。scene staging 位移与逻辑 UV 原点是两回事；参考已 baked，修改 metadata/custom property 不是实时 shader adapter。

新增 fingerprint：

- 16 态接触图：`0ba343930ca7916f99655fe90ed04d07f871a042be91994fc95089103318aa8f`
- phase 对照图：`db98a16498130689f54756202b09bda2aa9feafa203efd72c56ad73308ebe34b`
- reference blend：`30b3d1a564176919fca17416eb3f7dcf67275d76a9779fedd0f8b0756ec07f41`

## 同日追加二：stone_brick_stairs v05 代表几何 + 材质合审

**代表组合视觉评分 8/10，可保留为离线视觉技术样例。** 评分只限 `south / bottom / straight` 和这五张 fresh v05 图片。关闭该代表的 fresh v05 材质组合待审项；40 个 stair 状态全视觉、引擎/碰撞/手机仍未通过，不能计为全状态 accepted block。

五张 fresh 图全部实际查看，文件 hash 与 builder 明示的稳定新版完全匹配：master、optimized、optimized_mobile256、back_low、clay。两个 0.5 m 高度层级与 L 形 side silhouette 清楚，平面纹理没有掩盖步面/立面边界；母/减没有可见缩形或阶高损失。背低图确认代表的完整背墙/侧边，仍不是 underside 实拍。

v05 的薄灰绿 mortar、灰米色大面及轻微色阶变化在代表阶梯上读成石砖；按 8 courses/2 m 的 review repeat，1 m 墙面约 4 courses、0.5 m 立面约 2 courses，与新密度一致。256 图仍能辨认砖缝和步面。其较简化面纹与柔光/noisy clay 不足以称为所有视距、shader 和方向都已完成的高品质资产。没有将 stone 的失败状态移植到 brick，也没有评 blocked stone。

独立实际 GLB：20 三角、36 序列化属性点、12 焊接点；bounds `[0,0,0]` 到 `[1,1,1]`；面积 5.5 m²、体积 0.75 m³。无退化、边绕序/焊接异常、法线异常或非轴向三角；1,100 个表面探针异常 0，默认轴向 review UV 错配 0。单 mesh/material，opaque single-sided，metallic=0，roughness 约 0.8。

实际高度/方向与历史 PutStair 的下半格 `[0,0,0]–[1,0.5,1]` 加 south 高半格 `[0,0.5,0.5]–[1,1,1]` 相符。shapeId=3、texId=35/atlas34；corners 仍由邻居解析，不能用单个 straight 的样例证明其它转向/上下半/inner/outer 行为。

- master FBX 独立读出 176 三角/90 点；candidate FBX 20 三角/12 点；两者面积、体积及边界探针均相符
- 母/减同视角独立 MAD=0.00003824869791666667 RGB255，仅 3 像素任一通道差超过 2
- 512/256 同视角独立 MAD=0.3336181640625，21,813 像素任一通道差超过 2；不能说逐像素相同。此画面中的砖缝仍清楚，但未验压缩/mip/远景
- 新几何 Position/Normal/UV0/index 与 v01 逐值一致；只删除 288 B 解释性 UV1，mesh accessor 1,560→1,272 B。材质已切换为明确的 isolated v05 引用
- source packed PNG 与实际 GLB embedded PNG 均逐字节对应 v05 512 资源，SHA=`323bbb4bfa4a2b813ae31220fb4ad0b2d452d87e1c4f7e5fdb9421b0b3b33333`
- candidate GLB SHA=`3230139e4a2e2feca1490cec57271915391010d48c6b6865548e80ba0701ae93`

176→20 的 88.64% 是新 authoring-grid 母版减面。相对历史 straight 两盒 24 三角，当前 20 少 16.67%，可作该代表的几何计数事实；仍不能推导 draw call、手机帧时或全状态性能。此源/current review UV 仍不是 native UV0 `(35,0)` 的直接替换。

本轮仍是 **fence candidate + stairs representative candidate，两者全状态 accepted 均为 0，mobile_pass=false**。新增可以缩小后续检查范围，但没有代替当前版本集成、完整状态视觉、邻居/区块/碰撞和设备门。
