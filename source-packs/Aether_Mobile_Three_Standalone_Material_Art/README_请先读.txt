Aether 手机端材料美术样件（3件）

内容：橡木板、暖灰白色混凝土/灰泥、银灰铁材

本包通过了限定范围的独立美术审查、可编辑 Blender 材质库复开、贴图 hash 和 cyclic gutter 索引算术复核。保留了同机位高低分辨率对照；灰泥和铁还验证了128纹理及96/48像素投影下的可读性。

集成与手机设备验证仍待完成：这些不是 Unity 原生 .mat、已接入方块、URP 移植或手机帧率测试。历史 HDRP 管线不支持 Android/iOS，后续须独立解决渲染管线和 shader 适配。铁贴图在历史 BK family3 路径被固定值覆盖，不能直接认为替换贴图就会生效。

各 .blend 是可编辑审查材质库；立方体只是一个1m、12三角面、1材质槽的审查道具。纹理已打包，同时使用相对路径 //textures/<variant>/basecolor.png。母版1024与候选512/256可比较；灰泥/铁附128低预算候选。降低源图分辨率不会自动降低整张运行图集的占用。

BaseColor=sRGB；Normal/Roughness/DRAM/HDRP Mask 为数据图。两种packed通道不同，详见每件说明；手机最低配置可使用BaseColor和shader常量而不加载中性法线/常量roughness图。表面周期2m。未混入失败石材或待合审砖材，原工程未修改。
