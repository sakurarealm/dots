厨房水嘴r03：五阶段离线可视增量交付

全部小包解压到同一目录，保留kitchen-sink-stage-r03目录结构。stages中L1–L5.glb已包含完整建筑可视几何，纹理通过../textures解析。rollback中五GLB为原portable-r02逐字节精确副本，同样使用../textures。不要覆盖原工程。

只修改各阶段station.wash的水嘴底帽为真实开口及内腔，净增16三角形。其他节点、变换、ID、网格、材质、纹理、阶段JSON与升级信息保持。精确节点/mesh范围及SHA见validation/stage-preservation.json。

module-catalog.json、阶段JSON与upgrades保留基线原字节，其assetRevision/geometrySha256仍描述旧基线。candidate-overlay.json单列离线覆盖关系，旧catalog不是r03发行manifest。此包不提供所有独立模块，不重复已交付的水槽模块与blend包；独立模块已交付项见existing-module-delivery.json。

复现：python3 source/patch_stages.py，仅读包内rollback、审核过的紧凑几何增量和SHA记录，输出reproduced-stages/，输出SHA必须与冻结stage完全一致。此脚本仅依赖Python标准库，五阶段已实际运行验证。增量不是文件二进制分片。

渲染：已有Blender环境运行blender -b -t 2 --python source/render_installation.py。该脚本仅使用包内stages/rollback/textures，生成11张同视角前后安装图/近景。便携脚本AST及全部依赖已核验，未重复运行整套渲染。图片原分辨率、像素数据均保持，只删除含环境路径的文字元数据，SHA变更可查validation/preview-metadata-sanitization.json。

这是离线阶段可视候选，不是Unity或游戏运行接入，不证明流体、碰撞、路线或实际建造通过。内腔55mm，开口16mm，不表示整条水管贯通。
