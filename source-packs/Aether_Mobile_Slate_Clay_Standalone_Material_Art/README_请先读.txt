Aether 深板岩与红陶土材料美术样件

两件均以限定范围通过独立美术审查（8/10）、可编辑Blender库复开、packed/外部PNG逐字节核对、4px cyclic gutter索引核验，以及256/128纹理和96/48像素投影可读性复验。

深板岩是深灰切石砌面，不沿用旧catalog中把tile误判成roof的语义。红陶土使用唯一调色后的v02原件，实际平均RGB159.4/72.8/59.6、约#9F493C，比目标#A94C3F略暗约6%；没有声称精确命中色。

仅美术样件。完整方块状态、Unity原生材质、URP接入、项目集成与手机性能测试仍待完成。HDRP不支持Android/iOS（Unity6官方表：https://docs.unity3d.com/cn/6000.0/Manual/render-pipelines-feature-comparison.html）。不能把孤立Blender审查桥当作游戏实景或手机测试。

每件.blend保留相对纹理路径//textures/<variant>/basecolor.png并打包同样的PNG。审查立方体为1m、12三角面、单材质槽；每个材质有1024/512/256/128版本。素材角色与旧native147/327仅供适配参考，未改项目ID/注册表或共享bk_plaster。

BaseColor为sRGB；其他图为数据图。DRAM与HDRP Mask通道不同；最低移动配置可用albedo和shader常量，不必加载中性法线/常量roughness贴图。降低源图分辨率不会自动降低整图集占用。
