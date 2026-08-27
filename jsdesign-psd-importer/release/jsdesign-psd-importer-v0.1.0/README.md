# PSD 可编辑导入（即时设计 MVP）

将 `.psd` 文件在即时设计插件内本地解析，并创建可移动的原生图层。普通 Photoshop 文字图层会转换为可编辑文本。

## MVP 范围

- PSD 图层组 → 即时设计画板容器
- PSD 位图图层 → 独立图片图层
- PSD 普通文字 → 可编辑文本
- 保留基础位置、尺寸、显隐、透明度和常见混合模式
- 缺少字体时使用即时设计默认字体并给出提示

暂不处理复杂滤镜、调整图层、完整蒙版编辑、智能对象内容编辑和 PSD 反向导出。

## 构建

```bash
npm run check
npm test
npm run build
```

构建后会生成 `dist/code.js` 和内联所有依赖的 `dist/ui.html`，无需联网即可运行。

## 在即时设计中调试

1. 打开即时设计「插件广场 → 开发者中心」。
2. 导入本目录的 `manifest.json`，或按页面提示上传 `manifest.json`、`dist/code.js` 和 `dist/ui.html`。
3. 运行插件，选择或拖入 PSD 文件。

## 技术说明

PSD 解析使用 [ag-psd](https://github.com/Agamnentzar/ag-psd) 30.1.1。解析器以预构建文件内联在插件 UI 中，文件不会上传。

项目结构参考了 MIT 协议项目 [4NaNBo1/psd-to-figma](https://github.com/4NaNBo1/psd-to-figma) 的「PSD 解析 → 平台节点」思路，MVP 代码为针对即时设计的独立精简实现。
