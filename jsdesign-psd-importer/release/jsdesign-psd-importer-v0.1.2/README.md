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

构建后会在项目根目录生成 `code.js` 和内联所有依赖的 `ui.html`，同时保留 `dist/` 副本，无需联网即可运行。

## 在即时设计中调试

1. 打开即时设计「插件广场 → 开发者中心」。
2. 导入本目录的 `manifest.json`，或按页面提示上传根目录的 `manifest.json`、`code.js` 和 `ui.html`。
3. 运行插件，选择或拖入 PSD 文件。

文件选择区域使用原生文件控件覆盖整个卡片，避免桌面版内嵌页面拦截脚本模拟点击。

### 0.1.2 导入修复

- 合并 Photoshop 基础文字样式与样式分段，避免颜色、字号和粗斜体被空的分段样式覆盖。
- 按 Photoshop 文字变换矩阵还原字号与行高缩放。
- 根据 PostScript 字体名匹配即时设计中的粗体、斜体变体；缺少原字体时优先保留字重和斜体倾向。

## 本地应用实测

打开即时设计 MCP Bridge 后运行：

```bash
npm run test:bridge
```

该测试会在当前真实画布临时创建 PSD 导入结构，验证 FRAME、分组和可编辑 TEXT 的创建、移动与改字，然后立即清理测试图层。

## 技术说明

PSD 解析使用 [ag-psd](https://github.com/Agamnentzar/ag-psd) 30.1.1。解析器以预构建文件内联在插件 UI 中，文件不会上传。

项目结构参考了 MIT 协议项目 [4NaNBo1/psd-to-figma](https://github.com/4NaNBo1/psd-to-figma) 的「PSD 解析 → 平台节点」思路，MVP 代码为针对即时设计的独立精简实现。
