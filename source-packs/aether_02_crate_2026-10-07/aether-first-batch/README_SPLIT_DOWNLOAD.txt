Aether 首批原创城镇样件 · 分包下载说明

本批共四个ZIP：工作台、木箱、A字梁架、共享资源。它们属于同一套样件。

如何组合
1. 下载并解压全部四个ZIP，将内部 aether-first-batch 的内容合并到同一个同名目录
2. 若解压软件额外套了一层压缩包文件名目录，请移出其中的 aether-first-batch 内容再合并
3. 合并后应有 source 内3个blend，exports内3个资产子目录，textures内12个PNG，previews内3个资产子目录，scripts内4个复跑脚本
4. 查看或编辑时用 source/*.blend。源文件已打包材质贴图，单件源文件可独立打开
5. 导出文件位于 exports/<资产名>/。FBX内嵌纹理，GLB为LOD0材质审查模型。未自动生成Unity Prefab或接线

相对路径
源文件在 source/，共享贴图在 ../textures/。复跑脚本由自身 scripts/ 的位置寻找包根目录，始终保留 scripts、source、exports、previews、textures、reports 为同级目录
Blender棚拍不是游戏实景。Unity真实导入、项目Shader、Prefab、碰撞/导航、交互及LOD切换尚未验收

已测范围与视觉评分
工作台16/18、木箱16/18、梁架15/18，独立图审全部PASS
FBX/GLB往返、米制尺寸、法线闭合组件、UV面积、LOD几何保护检查通过
LOD视觉并非无损：部分钉头、板缝与角柱细节在低LOD发生变化；布感和黄铜反射仍有非阻断改进项
完整技术与视觉报告在 reports/ 和 reviews/，梁架首轮11/18记录保留

重建注意
复跑脚本会重建包内同名样件。先备份你改过的源文件，并只在这个独立样件目录使用
