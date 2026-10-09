# Aether 原创城镇样件 · 2026-10-07

这是独立制作、可编辑、可复跑的首批三件原创样件。未改动或提交 Aether 工程。

## 三件资产

- `town_shared_workbench_v01`：木工工作台，台面高 0.78m；带独立木质夹钳、螺杆和手柄轴心；空下层架与一卷苔绿帆布
- `town_storage_open_crate_v01`：开口搬运木箱，主体约 0.75 × 0.50 × 0.50m；提手开口为实际几何，没有烘入库存或内容物
- `town_building_a_frame_bay_v01`：4m 结构跨距、1m 重复进深的 A 字梁架与板屋顶模块，侧檐出挑 0.40m；这是可拼接构件，尚不是完整建筑

完整外包尺寸包含夹钳、五金、屋面压边，见各资产报告，不把结构尺寸当作最终包围盒尺寸。

## 来源与风格选择

可核验的设计来源为 Aether 分支 `handoff/2026-10-04`，提交 `0956b0777cf007a7a3b1ed799f7ade777f14c80d`。这份资料没有证明它就是用户今天工作区的最新版本。

- `Docs/Design/TownGameplay/2026-09-29/ui-all-buildings/index.html`：18份四屏UI设计板，是概念和场景视觉参考，不能当作已建成建筑或准确三维尺寸
- `Docs/Design/TownGameplay/2026-09-29/ART-P0-SAMPLES.md`：角色1.75m、台面0.78m、0.25m制作网格及真实支撑面/轴心基线
- `Docs/Design/ArtStudy/2026-10-01_美术参考与原创资产管线.md`：剪影、原创边界、低频手绘技法、单一强调色与技术/视觉分开验收
- `Docs/Design/ArtDirection/2026-10-03_治愈奇幻风格化改造方案.md`：无描边、无强菲涅尔、可读分面、哑光主体、少量五金、共享材质族及放置原点规范。这份是提案，作为暂定样件方向
- `Tools/ElementsArt/ASSET_SPEC.md`：米制、FBX `-Z/Y`轴向、不得手写Unity `.meta`。元素资产专用的预算、着色器和颜色通道不直接冒充城镇统一规则

已处理的来源冲突：9月30日P0记载墨线和Standard显示；10月1日ArtForge及10月3日方案采用AgX与无描边。样件暂采用更新的无描边/手绘渐变方案。没有采用历史Cocricot重建造型，没有复制BK模型或第三方纹理。

## 返修与验收状态

2026-10-07 三件完成技术导出复检。独立逐图视觉审查结果：

- town_shared_workbench_v01：PASS，16/18，第1轮
- town_storage_open_crate_v01：PASS，16/18，第1轮
- town_building_a_frame_bay_v01：PASS，15/18，第2轮

梁架首轮11/18失败后的修正：屋脊提高0.72m、坡度约44.52°；使用同一木材的深色UV区做压顶；共享木材改为宽笔触和低频渐变；LOD1/2保留五金与布的几何，部分钉头视觉对比变弱，不能称视觉无损；近景黄铜仍偏哑光黄绿。
木箱已消除角柱/压边共面黑块；长板与端板采用非重叠接缝；提手木开孔约0.37×0.0465m，布带局部覆盖右缘，正面未被布覆盖宽约0.3525m；实际握持动作未测试。
各LOD闭合组件无负体积、无零UV面；FBX/GLB往返尺寸与三角数复检通过。
视觉结论只覆盖Blender棚拍。Unity真实导入、项目Shader、碰撞/导航、交互与LOD切换仍未验收。

## 文件结构

- `source/*.blend`：可编辑资产，贴图已打包。`SOURCE_PARTS`中保留独立具名零件；默认隐藏，供修改结构时使用。`LOD0_Static`是运行时静态合批网格，两者不要同时显示
- `exports/<资产名>/*.fbx`：模型、LOD、简化碰撞代理和锚点；FBX内嵌纹理
- `exports/<资产名>/*.glb`：仅LOD0的材质审查模型，避免LOD与碰撞几何重叠
- `textures/*.png`：三套共享512²真实PNG，含BaseColor、OpenGL方向Normal、Roughness和HDRP MaskMap
- `previews/<资产名>/`：正/背/左/右/顶正交图、透视图、细节、无纹理灰模、同机位LOD0/1/2对照和透明图标。全部是Blender棚拍，不是Unity游戏实景
- `scripts/`：原创生成、导出往返校验及CPU低负载出图脚本
- `reports/`：几何、尺寸、轴心、材质、导出/重导入和可拼接性记录

## 运行方式

使用Blender 4.3.2或先验证API兼容的新版本。示例：

```sh
blender --background --factory-startup --threads 2 --python-exit-code 1 --python scripts/build_samples.py
blender --background --factory-startup --threads 2 --python-exit-code 1 --python scripts/verify_roundtrip.py
blender --background --factory-startup --threads 2 --python-exit-code 1 --python scripts/render_samples.py
```

脚本由当前文件位置寻找包根目录，生成过程会重建包内同名资产。修改前保留你的版本。不要对原工程或第三方目录直接运行替换。

## Unity导入边界

FBX导出 `axis_forward=-Z`、`axis_up=Y`，1单位=1m；Blender坐标 `(X,Y,Z)`对应预期Unity `(X,Z,-Y)`。在实际Unity导入前，仍应以标定物核实方向和单位。

建议 `globalScale=1`、`useFileScale=1`、法线Import，新增 `.meta` 由Unity生成。LODGroup、COL代理转换为BoxCollider、锚点对接以及材质槽绑定是显式接线工作，不能声称导入器已经自动完成。

材质为可移植的Principled审查桥接，不代表已复现项目赛璐璐shader。BaseColor是sRGB；Normal、Roughness、MaskMap是数据贴图。MaskMap通道为R金属、G中性AO=1、B细节mask=1、A平滑度。法线为GL绿通道方向，Unity NormalMap导入后的正反须实测；未擅自决定BC5/BC7压缩方案。AO没有烘焙现场遮挡。

工作台夹钳运动件在各LOD中可共享同一Renderer；新增LODGroup须包含它们。模型只提供几何、轴心和操作参考，没有实现夹紧动画、库存、建造或生产。

COL_*是简化代理，不是已经验证的Unity碰撞。木箱内容空间保留，但提手代理没有逐孔物理形状；梁架使用柱/横梁/斜屋面代理，未验证角色导航或屋内通行。

## 已测与未测

已测：保存后重开源文件；米制尺寸、有限坐标、UV、单位缩放、LOD几何、闭合/非流形/零面积检查；FBX与GLB导出重导入，三件三角数差为0，尺寸最大误差小于0.000001m；1m梁架重复模块的边界不发生正体积重叠。

未测：用户今天工作区规则差异；Unity真实工程导入、项目shader/HDRP呈现、Prefab引用、实际碰撞/导航、第一第三人称操作、角色IK、LOD切换/TAA、同屏性能、冷载与存档。Blender结果和独立视觉评分不能替代这些验证。

通用ArtForge建模提示的部件数/平滑面比例体检未在此独立样件调用。源文件保留分离零件，运行网格按静态部分合批；记录的是本次明确执行的检查，不能称为整条项目验收流程通过。
