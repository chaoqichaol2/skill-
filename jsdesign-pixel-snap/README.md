# 像素归整 Pixel Snap（即时设计插件）

用于发现并修复图层 `X / Y / 宽 / 高` 中的小数像素，减少边缘发虚和交付数值不整齐的问题。

## 功能

- 扫描当前选中图层，可选递归扫描子层级
- 支持 `1px` 整数网格与 `0.5px` 半像素网格
- 支持就近、向下、向上三种归整方式
- 点击结果可在画布中定位图层
- 支持单个修复和一键修复
- 自动跳过锁定图层、自动布局控制的位置、实例内部等不宜直接修改的内容

## 在即时设计中调试

1. 打开即时设计的「插件广场 → 开发者中心」。
2. 新建或导入本地插件，选择本目录中的 `manifest.json`。
3. 在画布中选择图层，运行「像素归整 Pixel Snap」。
4. 先查看检查结果，再点击「一键归整」。

即时设计的入口名称可能随版本变化；如果没有“导入本地插件”，请在开发者中心创建插件后，分别上传 `manifest.json`、`code.js` 和 `ui.html`。

## 开发检查

插件没有第三方依赖。在本目录运行：

```bash
npm test
npm run check
```

## 设计取舍

本版只处理图层的几何边界，不移动矢量路径内部的锚点，也不默认处理字号、圆角和描边。这样可以降低图标变形、文本重排和组件实例异常的风险。

## 参考

- [Figma 官方插件示例](https://github.com/figma/plugin-samples)：插件主线程、界面与消息通信结构
- [Figma 开源插件资源目录](https://github.com/figma/community-resources/blob/main/plugins/README.md)：设计检查器与工具类插件参考
- [Pixel Perfect](https://figma.pluginsage.com/plugins/741300632449121669)：递归处理选择内容，将位置与尺寸归整到完整像素
- [Shapes Snap To Pixel](https://www.shapes.gg/snap-to-pixel-a-figma-plugin/)：处理选择内容，并提醒不要对整页内容无差别执行
- [九匠即时 MCP](https://gitcode.com/next-lyle/jsdesign-mcp)：即时设计的 `jsDesign`、`manifest.json`、`code.js` 与 `ui.html` 运行结构
