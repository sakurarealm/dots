# fence 既有多格拼接、partial52 成本与补充背视独立追加审查

日期：2026-10-08 UTC。只补齐 `fence_extra_review_handoff.json` 的新增待审证据；先读原 `oak_fence_v02_independent_review.md`，不重复或覆盖其已成立结论。没有新建资产、改 source、运行 Blender/render、Unity、设备、本机任务或 Codex。只新增本报告、独立 JSON 和只读复现脚本。

## 条件化结论

**四个既有多格离线参考的成对接触帽面删除与实际 world-offset/构件方向 UV 可以有限通过；partial52 仅通过 mask10 渲染比较参考的文件/外表覆盖事实；16 态补充背图通过第二个上方斜视角的有限视觉检查。**

整体仍是 candidate，完整 accepted block 贡献为 0。`native_integrated=false`、`mobile_pass=false`、`production_art_accepted=false`，移动端运行时表示未选定。不能将 partial52 当作 clean exterior union、closed collider、全 16 态 adapter 或原生顶点属性保持方案。

## 方法与指纹

- 直接独读实际 `oak_fence_patterns_cost_reference.blend` 的 Blender 4.03 little-endian SDNA；压缩文件 329,853 B，解压 790,216 B
- 用既有独立 SDNA reader 读取真实 Mesh 位置、面角、UV 和 Object 变换；未导入 maker 的生成函数。比较用的真实 16 态 source 是此前已独审的 `oak_fence_connection_phase_reference.blend`
- 手工盒占据与轴向平面分区独立枚举完整 exterior；每个分区内占据恒定，分区面积逐面与 Newell 面积相符。此处是离线文件几何证明，不是 renderer 或 collider 测试
- 交付清单 12 个文件的大小与 SHA256 全部与 handoff 逐项完全一致，具体值保存在 `fence-extra-independent-audit.json`
- 复现：在 geometry/reviews 目录执行 `PYTHONDONTWRITEBYTECODE=1 python fence-extra-readonly-audit.py`。脚本只读已有证据，只写同目录独立 JSON，耗时约 1 秒，无 Blender 进程

核心指纹：

- patterns/cost source：`6e4dd05a12d1ca47d5e79920450d3478db11c5f4c5abf3bc88641b9b3b967ea8`
- partial52 GLB：`7d9abef66338527e39f452b472de0d4f54aab5f5c100602c540a6d4b5c340885`
- 共享 oak PNG：`3ef497d9c74f42db633f9434d4593c3b5b0a65f6044c093efe9cb3f174b24031`；source 完整 packed bytes 与 GLB embedded bytes 均一致

## 四个真实多格 source mesh

| pattern | 原闭合单格三角合计 | 仅删匹配帽面三角 | 真实拼接三角（面角 n−2） | 面积 m² | signed volume m³ | 实际接缝 UV 配对 |
|---|---:|---:|---:|---:|---:|---:|
| line | 264 | 24 | 240 | 7.5 | 0.390625 | 48 |
| corner | 184 | 16 | 168 | 5.375 | 0.28125 | 32 |
| T | 268 | 24 | 244 | 7.5 | 0.390625 | 48 |
| four_way | 356 | 32 | 324 | 9.625 | 0.5 | 64 |

对 `PATTERN_line/corner/T/four_way` 的独立结果：

- 与按逻辑 cell 原点平移的真实单格 STATE 面集逐一匹配；只删实际相邻格上相向、同形的接触 caps，其他位置/绕序和按独立算式 world-offset 后的 UV face-loop 签名全保留
- 12 个实际 cell 接缝，每条有两层梁的 cap；24 对相向矩形帽面，每面 0.03125 m²，删除合计 48 个 polygons / 96 triangles / 1.5 m²。不存在只凭整格 opaque 断言而删除部分覆盖面的情况
- 四 mesh 坐标焊接后的非双邻接边、开边和边方向异常均为 0；完整预期 exterior 没有缺失、额外边界或共面重复覆盖
- 1,468 个轴向平面分区全部属于正确外表；不是把凹 n-gon 的正面积 fan 错算成重叠几何
- 1,584 个实际存储 face-loop UV 与独立世界原点/构件方向规则相符；12 条 X/Z 实体接缝共 192 对 exposed side/top/bottom loop 点，最大 UV 差为 0
- T/four_way 已包含负逻辑 cell 原点；这补齐本组真实 Z 向、转角、T、四向拼接证据，但不代表 chunk accessor、float/origin rebasing、跨区块加载/编辑已测试

Source 的页面 staging Object 位移与逻辑世界 UV 原点分开记录。该几何已经焊成离线参考 assembly，没有真实 cell/chunk ownership、picking IDs、dirty 更新或端帽恢复流程；闭合数学壳也没有变成经测试的原生碰撞体。

## 84 union / 60 overlap / 52 trimmed 的真实代价与限制

| 表示 | 实际 GLB 三角 | 属性顶点 | mesh accessor payload B | 整 GLB B |
|---|---:|---:|---:|---:|
| exact union | 84 | 132 | 4,728 | 232,468 |
| five overlapping boxes | 60 | 120 | 4,200 | 231,948 |
| partial52 render reference | 52 | 104 | 3,640 | 231,444 |

三文件均实际重新读二进制；84/60 的 SHA 与原独审相同。Payload 只包括 Position/Normal/UV0/index，**不包括纹理、GPU 对齐、上传/区块重复、native buffer 或引擎内存**。84 比 60 多 40% 三角；52 比 60 少 13.33% 三角及 560 B（13.33%）mesh accessor。文件总大小差不是手机显存或帧时收益。

实际 source exterior 审计：

- union84：唯一完整 exterior 2.25 m²，无内面/重复面，闭壳；signed volume 0.109375 m³
- overlap60：唯一 exterior 仍为 2.25 m²，但额外保留 0.59375 m² 内部面与 0.03125 m² 共面重复外表；面积累计 2.875 m²，组件 signed-volume 合计 0.125 m³ 不能当 union 体积；焊接后 8 条非双邻接边
- partial52：唯一完整 exterior 2.25 m²，无 exterior 缺失或共面重复；仍保留 0.125 m² 的柱侧内部面，面积累计 2.375 m²；16 条开边，故 clean-exterior/closed-collider 均为 false。其 surface-integral 0.1145833333 不是有效闭壳物理体积

### partial52 明确做了什么

它把 rail 的内端从 X=0.5 截到柱面 X=0.375/0.625，并省去四个新 rail mouth caps。原柱全部六个面及四个 exposed rail outer caps 的位置/UV 完全保留；16 个 rail side/top/bottom polygons 改了形状，引入 16 个新端点。因此 **不是 raw60 的精确三角、角点或顶点属性子集**，不能套用整面 cap-only 删除的非线性 scalar/UV/tint 插值保持结论。

实际 GLB 的 26 个 source 矩形各由恰好两个三角覆盖；序列化 P/N/UV 与 source 面角一致，UV 的 glTF V 翻转已正确处理。0 退化、0 法线错误、0 非轴向三角、0 directional UV 错配。

**2,860 个 GLB 三角表面探针中的 76 个 boundary 失败，全部来自保留的两侧柱面四个三角，向外偏移后仍处于 rail 占据内部；不是漏掉外表。** 分类为 2,784 正确外表 + 76 内部面，reversed/unsupported 均为 0。独立完整平面分区另确认 exterior 缺失面积 0，残留柱内面面积 0.125 m²。16 个边方向计数不配对对应 open rail mouth 边界，不能误读为额外的闭壳翻面缺陷。

### Export/材质和范围限制

- partial52 GLB 实核为 231,444 B，104 个 float Position/Normal/UV0 属性点、156 个 uint16 index；opaque、single-sided，basecolor 使用 UV0 和同一 oak512
- 其 node 仍带成本图 staging translation `[-1.4560879469, 0, -0.9707252383]`；本地 mesh bounds 在格内不代表整 node 已归零。它不是可直接按格角 origin 接入的 block export，本次不修改源或重新导出
- 实际 source SDNA node/link 指向 `Toon BSDF → Material Output`；GLB 是后来修正的标准 PBR bridge，metallic=0、roughness≈0.7。现有 diffuse-toon 比较图没有验证导出 PBR 或 native shader
- four_way 的 union160 已在既有 STATE_1111 source 中有实际文件几何；raw108/partial92 是九盒及删 rail mouths 的算术，其中 partial92 没有实际 source/GLB 本轮验收，更没有 all16 trimmed adapter
- 本轮没有改 scalar/UV native 接口。已有 review UV 是普通定向 bake，仍非历史 native UV0=(texId,0) / world-triplanar 的直接替换；真实完整顶点格式、ID/tint/scalar 的行为未验

## 实际逐张看的五图

- `oak_fence_multicell_world_phase_raw.png`（1280×1080）及标注图（1280×1180）：直线、转角、T、四向的两层梁/开口清楚，构件 grain 可读；现有角度未发现新的可见封口、缺梁或黑面。照片不足以目测证明每个纹理 texel 连续，接缝相位结论由真实 loop 证据支撑
- `oak_fence_representation_cost_raw.png`（1280×540）及标注图（1280×650）：60 overlap 中柱顶有明显黑片，84/52 同图未见该黑片，三者外轮廓/开口可读。黑片与文件中的柱顶共面重复区域相符，但本轮不重跑 renderer，不能推断 Unity 必然复现相同颜色或深度行为
- `oak_fence_connection16_back_contact.png`（1280×1390）：16 个标签/实际 source 三角计数对应，孤柱、单臂、直线、转角、T、四向在补充背侧角度中均可辨，两层梁与间隙保留，无新的可见几何硬伤。Back script 使用既有 STATE source，front 相机 Blender=(3.7,4.3,3.5)，back=(-2.7,-4.3,3.5)，两者都在上方；它是第二个斜视角，不能当 underside、全角度或原生动态 16 态证据

Source packed shared texture、图像的准确 SHA、源材质 graph 和 back provenance 均在独立 JSON 中。五张图来自已有离线 diffuse-toon 参考；软光、分辨率与有限视角不支持 production art 放行。

## 仍开放的门

当前版本 native code/完整顶点属性、16 态真实邻居解析与 adapter、chunk ownership/picking/ID、跨区块邻居 load/unload/edit 及 caps 恢复、native UV/tint/shader/backface、碰撞/交互、Android/iOS 压缩/mip/真实视距及 CPU/GPU/内存/帧时均未通过。历史 Fence VoxelVolume 的 full-cube fallback 风险继续保留，当前版本物理未知。

本次只关闭以上既有离线多格/成本/第二背视的新增证据门。它不选择运行时表示，也不新增一个 full-native、mobile 或 production-art accepted block。
