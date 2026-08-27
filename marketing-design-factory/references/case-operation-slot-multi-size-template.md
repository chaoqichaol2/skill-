# Case: 运营位多尺寸模板（乐成长·夏日惊喜示例）

Use this source-backed case when a Chinese internet-finance campaign needs one visual language recomposed across a homepage banner, a tall activity popup, and a compact hot-activity slot.

## Source Of Truth

- 即时设计文件：`营销设计工作流_MCP模板库_v1`
- 文件 ID：`6a44be09c81e559ae1005641`
- 页面：`04_运营位尺寸模板`（`0:5`）
- 采集时间：`2026-07-17T02:12:22.511Z`
- 采集范围：用户当时选中的 3 个画板及其完整一级图层属性
- 状态：`complete`；后续优先读取本地采集，不重复连接即时设计。只有用户要求同步、源文件变化或本地采集缺失时才重读。

Machine-readable source: `../assets/cases/operation-slot-multi-size-template/source-capture.json`

## Selected Frames

| Role | Frame | Size | Composition |
| --- | --- | ---: | --- |
| 主视觉 | `首页Banner_1035x300` | 1035×300 | 左侧标题、副标题、CTA；右侧主视觉；右上角广告标识 |
| 弹窗延展 | `活动弹窗_912x1035` | 912×1035 | 顶部标题与副标题、中部放大主视觉、底部宽 CTA；右上角广告标识 |
| 热门活动延展 | `热门活动_498x216` | 498×216 | 左侧压缩信息与 CTA、右侧主视觉；右上角广告标识 |

## Confirmed Content And Layer Contract

- 主标题：`乐成长·夏日惊喜`
- 副标题：`资产保级领好礼`
- CTA：`立即参与`
- 广告标识：固定为 `广告`，三个画板均位于右上角。
- 语义图层：`@bg_背景`、`@hero_image_主视觉`、`@title_主标题`、`@subtitle_副标题`、`@cta_按钮背景`、`@cta_按钮`。
- 标题字体：`AlimamaShuHeiTi Regular`；副标题与 CTA：`方正兰亭中黑简体 Regular`。
- 主标题、副标题和 CTA 文案可替换；背景和主视觉是可替换图片层；广告标识为不可遗漏的固定字段。

## Visual System

- 中文互联网金融视觉，采用晴空蓝、草地浅绿、橙红主体与白色大字。
- 主体是手持红包/礼券的橙红动态角色，承载“成长、活力、权益奖励”的叙事。
- 标题使用白色展示字和柔和蓝色投影；副标题在半透明横向色带上突出黄色权益词。
- CTA 为橙红到黄色的高亮圆角胶囊，白色居中文字。
- 该蓝、绿、橙三色组合仅适用于夏日、成长或年轻化金融主题，不自动推广为所有金融营销需求的默认配色。

## Recomposition Rules

1. 以 1035×300 横版为主视觉结构；尺寸变化时重新组织层级，不做整体等比缩放。
2. 竖版弹窗采用“标题—副标题—主视觉—CTA”的纵向序列，并显著放大主视觉和按钮触达面积。
3. 498×216 热门活动位压缩左侧文字与 CTA，将角色保持在右侧；允许副标题色带超出画板后由画板裁切。
4. 所有尺寸必须保留同一组识别锚点：标题处理、橙红角色、草地与天空场景、橙红 CTA，以及右上角 `广告`。
5. 自动替换时按语义图层前缀定位，避免依赖图层顺序或坐标猜测。

## Exported Source Previews

- `../assets/cases/operation-slot-multi-size-template/首页Banner_1035x300.png`
- `../assets/cases/operation-slot-multi-size-template/活动弹窗_912x1035.png`
- `../assets/cases/operation-slot-multi-size-template/热门活动_498x216.png`

## Known Unknowns

- 副标题含局部混色，但桥接返回的整体 `fills` 为 `null`；精确的逐字颜色仍需在下一次明确同步时补采。
- 即时设计返回的字体粗细为空；不要从视觉猜测数值。
- 背景、主视觉、副标题色带和 CTA 背景均为图片填充层，当前选区中没有可继续拆分的内部图层。
- 弹窗画板是完整可编辑画面，不代表所有渠道最终都直接交付 912×1035；实际圆角、遮罩、尺寸及文件体积仍以广告位规范和当次需求为准。

## Reuse Boundary

This case proves a source-layer naming and multi-slot recomposition method. It does not prove that the sample wording, mascot, palette, or 912×1035 popup size is universally approved. Keep those decisions case-specific until the user confirms them for a new campaign.
