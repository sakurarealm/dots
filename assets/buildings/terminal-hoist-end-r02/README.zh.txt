空港cargo.hoist绳端连接 r02 局部原创候选

适用L4/L5。保留原cargo.hoist根ID、模块ID、位置、框架、Cable及其他建筑几何；仅追加三个扩展子件：空心终端套筒（含两侧短夹持销）、连接环、实心封端J钩。未加卷扬机、绳路系统或运行行为，新增扩展original645Contribution=0。

连接环和钩派生自已审核仓库r02自制几何。连接环去掉原绳索绑扎圈、改为本空港已有SHARED_iron；J钩仅补原管状生成的两端封面。套筒与夹持销新作。所有可见新件使用空港原有SHARED_iron，不引入外部材质。原空港source_inputs/provenance声明originalMaterialsOnly/noRestrictedBKInputs，build_terminal.py直接构造原框架/Cable。

modules/terminal.hoist.end.r02.glb：三个扩展件组合，坐标是cargo.hoist根局部。
modules/terminal.hoist.r02.*.glb：三份独立扩展件。
modules/cargo.hoist.r02.glb：完整吊架模块，根保留原建筑放置变换。
source/terminal.hoist.end-r02-editable.blend：可编辑扩展件源。
stages/L4.glb、L5.glb：独立阶段候选；rollback保存原GLB精确回退件。贴图内嵌。
component-catalog.json：稳定扩展ID、来源SHA、局部源Z-up与GLTF Y-up坐标/连接点。origin是静态作者基点，不是已实现交互旋转轴。所有接口仅数据契约。
validation/preservation.json：原节点（除root追加children）、mesh/accessor/view/BIN前缀、材质纹理均未改。
validation/clearance-aabb.json：宽阶段包围盒检查；新钩/环没有旧件交叠候选，仅套筒预期包围Cable。实际甲板顶8.024，钩底8.227，竖向净距约0.203m。夹持销与Cable名义重叠2.5mm只表达固定接触，不是力学校核。

原南北/东西安装视角可有栏杆/箱体遮挡，近景从完整stage实际渲染，无隐藏几何。原L4两张审查图保留作同相机参考，光照可能不同。

本目录为云端离线可回退候选，输入依赖已包含于本包rollback与source_inputs，脚本使用包内相对路径。先将所有ZIP解压到同一目录，保留terminal-hoist-end-r02目录结构。没有上传、发布或游戏接入。CPU图片与静态几何不证明真实起重、载荷、安全、碰撞物理或手机性能通过。

复现：python3 source/merge_stages.py从包内回退GLB和冻结扩展组合重建reproduced-stages；两个输出SHA已实际复现。
重新编辑生成：已有Blender执行source/build_end.py，再用Python执行source/finalize_contract.py。源构造所需仓库原始两组件在source_inputs/warehouse-components，保留原SHA；其原材质只为来源留档，实际新增件统一使用rollback/L4的SHARED_iron。
渲染：已有Blender执行source/render_review.py，使用已包含相机参数与阶段模型。便携脚本均AST通过；未重新运行全部建模与渲染。可编辑blend已实际打开并另存，仅清除路径元数据；贴图已内嵌。
预览保留分辨率和所有IDAT像素数据，仅去文字元数据，变更SHA清单在validation/preview-metadata-sanitization.json。
