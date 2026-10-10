# 原创 UI 设计交付

82 张保留基线 PNG。

- `baseline-82/`：原82张基线，保留原始像素与版本。
- 当前提交仅含82张基线。`latest/`后续候选将单独追加，未算作已完成实装。
- `index.json`：逐图名称、类别、状态、像素尺寸、SHA256、Git blob SHA。
- `coverage.json`：已知剩余内容缺项。

全部图片已核对原创生成来源。没有加入第三方参考原图、未采纳 V4/V5 轮次或失败修订图。

设计候选不等于Unity、Web或手机交互实装；全套系统覆盖和运行验收尚未完成。机场26原基线的文字一致性和最终队伍校验状态仍需处理，失败修订未上传。

## 下载

单张：打开对应PNG，使用GitHub的Download raw file。
整仓：在仓库首页选择Code → Download ZIP，然后进入本目录。仓库还包含其他作品，整仓下载较大。
只取UI：使用Git sparse checkout，把路径设为 `overnight/2026-10-10/ui`。

只检出 UI 的终端命令：

```sh
git clone --filter=blob:none --sparse --depth 1 https://github.com/sakurarealm/dots.git
cd dots
git sparse-checkout set overnight/2026-10-10/ui
```
