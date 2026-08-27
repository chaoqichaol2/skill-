# 轻量去水印

纯 macOS 原生应用，不依赖 Python、PyTorch、OpenCV，也不下载 AI 模型。应用使用系统自带的 Vision 自动识别靠近画面边缘的文字水印，并用轻量邻域修复填补区域。

## 使用

直接双击“轻量去水印.app”。

1. 选择或拖入图片。
2. 点击“自动检测”。
3. 检查红色区域；漏检时直接在图片上拖动画框。
4. 点击“去除水印”，再导出结果。

## 适用范围

- 适合文字水印、角标、小面积 Logo、较简单背景。
- 复杂纹理、大面积半透明图案、覆盖人脸的水印，效果不如大型 AI 模型。
- 当前版本只处理图片，以保持应用尽可能小。

请只处理你拥有版权或已获授权编辑的素材。

## GitHub 方案取舍

- D-Ogi/WatermarkRemover-AI：自动化完整，但 Florence-2、LaMA 和 PyTorch 合计约 2GB。
- wudijimao/Inpaint-iOS：原生 Core ML，仍需附带修复模型，且主要依赖手工涂抹。
- froggeric/gemini-watermark-and-synthid-remover：体积较小且很快，但只针对 Gemini、Veo 和 NotebookLM 的固定水印。

因此本版沿用“检测 → 画框 → 修复”的成熟流程，改用 macOS 自带 Vision 与无模型修复，换取最小体积和零安装。
