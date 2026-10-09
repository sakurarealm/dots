# 六方向 × 三种道具：当前候选模型包（r2）

本包有 18 个真实静态 GLB、18 个独立零件可编辑 GLB、18 张当前模型预览及 3 张比较图。三种道具是面包车、茶摊、邮筒＋长椅；六方向是油画手绘、Cel、PBR 动漫、Poster/Gouache、Soft painterly 与 BK 项目候选。

“最终包”表示本次候选交付已整理、复核，不表示六方向已通过美术验收。之前认可的油画花摊只作为纹理品质来源；本包没有把旧技术夹具或旧比较图混进当前 18 个模型。

## 从哪里看
- comparisons：三种道具分别排列六方向，用当前实际 GLB 的预览制作
- models：不带后缀的是标准 GLB；_editable_parts.glb 是各零件有名字和本地轴心的编辑源，较多节点用于编辑，不是优化运行版本；NPZ 保存构建网格数组
- recipes：零件形状、位置、比例、旋转、颜色语义、UV 分区及变化记录
- atlases：模型真正使用的 1024×1024 贴图；GLB 内也嵌入同样 PNG
- sources/native：当前原生 1254×1254 图像工具纹理，不是分层 PSD
- prompts：已保存提示词；history 中是较早指令，不应当成 r3 最终生成的逐字提示词
- sources/atlas_provenance_final_r2.json：最终纹理、哈希、提示词完整性说明
- manifest_final_r2.json / model_index.csv：18 个模型的准确文件和参数
- validation：技术复核、原预览来源记录、资源保护记录和本次视觉检查范围

## 检查过什么
18 个运行 GLB 数值重读均通过：位置、法线、UV、材质分区与 NPZ 一致，贴图是实际嵌入图像。独立复核了 GLB 文件结构、缓冲边界、图片哈希、预览绑定的当前 GLB 哈希，以及 18 个编辑版零件变换后的世界坐标与原网格一致（最大误差约 5.96×10^-8）。每个运行模型 2798–4707 三角面、3 个材质、2–3 个 primitive；编辑版 102–138 个分别可变换节点。技术检查不是 glTF 官方认证。

已打开三张新比较图并审视全部 18 个当前预览。所检查角度没有明显丢贴图、脱离的吊牌、裁切或空模型。Poster 的 r3 重绘已经改成较平的大色块；Soft painterly 更柔和，但仍有宽笔触，与油画方向的区分需要继续由你判断。不是背面、底面和所有遮挡处的完整巡检。

## 渲染与接入边界
这些预览是实际 GLB 几何和其嵌入贴图的 CPU 三维光栅预览，带预览用中性地面。Cel 分段照明、Poster 的几何轮廓，以及各方向的光照混合写在 sources/render_actual_glb.py 中；它们不是 GLB 内含的 Unity NPR shader。普通 glTF 查看器或 Unity 标准 PBR 材质不保证显示同样效果。

PBR 包含实际 albedo 和按材质类别编写的 metallic/roughness 纹理。贴图 G 为 roughness，B 为 metallic；R 恒为 1，当前材质没有把它作为 occlusionTexture 使用。没有图像生成的 normal map，使用几何法线。粗糙度/金属度是分区常量，不是细节扫描图。

没有执行 Unity 或 Blender 导入测试，没有验证目标渲染管线或移动性能。没有交付 Unity 自定义 NPR shader、运行 prefab、动画、碰撞体、LOD 或第二套光照 UV。名称中的游戏参照只代表宽泛方向，不是复现官方着色器或画面；BK 是待校准的项目候选，并非已验证的项目 3D 规范。

## 本地可重复操作
脚本依赖 Python 3、NumPy 和 Pillow。它们以文件所在目录为基准，不需要 Blender。

数值验证：python3 sources/validate_glb_models.py
独立交付复核：python3 sources/verify_final_delivery.py
重排比较图：python3 sources/make_final_comparisons.py

编辑 recipes/<style>_<prop>.json 后可构建：python3 sources/build_market_props.py <style> <prop>
然后导出可编辑零件：python3 sources/export_editable_parts.py <style> <prop>
再用资源保护脚本预览：python3 sources/guard_light_preview.py <style> <prop>

注意：bread_cart 的构造代码在 build_market_props.py 中；茶摊和长椅直接读 JSON 零件。要修改面包车造型应编辑该代码中的具名零件构造，或单独编辑 editable_parts.glb。每次模型改动后需要重新导出、预览及复核，清单哈希随之更新。当前重绘的原生像素已经保留；再生成新贴图不保证逐像素一致。

本轮未调用 Codex 或 Blender。原预览记录显示保护 2 GiB 可用内存的 18 次轻量渲染全部完成；本次独立复核峰值约 49 MiB，不代表游戏运行内存。
