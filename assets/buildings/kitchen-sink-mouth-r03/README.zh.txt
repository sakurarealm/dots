厨房水槽 kitchen.sink：水嘴真实开口 r03 局部候选

仅修正向下出水嘴底部封帽。保留原外轮廓、倒角、位置、尺寸、节点名、材质与贴图。原版只读，未覆盖L1–L5或修改阶段引用；排水件和其他厨房结构未改。

改动：删除原铜材质primitive中底部封帽2个三角形，补16×16mm真实口部、最薄约3mm口沿、55mm内腔的内壁与腔顶。新增18面，净增16面。腔体只表达出水嘴开口与深度，不代表整条供水管已贯通、阀门逻辑或流体系统可运行。

模块：modules/kitchen.sink.glb（须保留../textures相对目录）
编辑源：source/kitchen.sink-r03-editable.blend（贴图已打包，包含口沿/内腔顶点组）
复现：先运行 python3 source/patch_open_mouth.py，再运行 blender -b -t 2 --python source/render_and_validate.py。
输入依赖全部在本目录：rollback/kitchen.sink.glb、textures/六张原贴图、validation/original-render-evidence.json的原视角参数。Python需要numpy；渲染需要已有Blender/Cycles。无需原项目目录。先解压两包到同一目录。

previews保留两组原整体视角前后图，以及口部斜视/轴向近景前后图。全部从实际GLB导入后CPU渲染，无隐藏遮挡物或绘制假洞。
validation/preservation.json记录原二进制前缀、原accessor/view、非目标primitive、剩余铜件三角形、节点及材料数据保持证据。
validation/readback-and-opening.json记录实际GLB回读、包围盒和射线证据：开口中心上射穿过旧封帽平面并抵达55mm深腔顶，口沿射线仍击中原底面；左右内壁位置与16mm宽度一致。

这是原创项目的局部离线建模候选。没有调用Codex、安装软件、访问用户本机、上传或发布。CPU图和静态几何验证不等于Unity、碰撞、真实供水或实际建造验收。

回退：rollback/kitchen.sink.glb为字节精确原版，纹理共用../textures。仅模块候选，L1–L5未接入。便携patch已实际复现并校验输出SHA；渲染脚本语法和路径已核验，便携版未重跑整套渲染。编辑blend由原已打包源另存为相对路径版本。
