# 快捷支付抽奖结果弹窗案例

## Case Purpose

Use this case as the approved reference for a newly developed post-draw result popup with two states. Do not treat it as the existing activity's original draw popup.

## Confirmed Requirements

- Product context: 长沙银行快捷支付活动抽奖结果。
- Trigger: Show after the user completes a draw.
- States: 未中奖 and 中奖.
- Development scope: Build a new result popup without changing the existing draw popup.
- Prize content: Configured dynamically by the business; the shown `¥100 微信立减金` is an example, not a fixed prize.
- Approved task copy example: `完成10笔快捷支付` and `即可获得3次抽奖机会`.
- Actions: `以后再说` and `快捷支付介绍`.

## Approved Visual Decisions

- Use a centered light card over a darkened activity-page backdrop.
- Use a pale warm gradient, white lower area, large bottom corner radius, and restrained dotted decoration.
- Keep the two states on the same layout system.
- 未中奖: Use gift-box and crying-expression imagery with `很遗憾未中奖`.
- 中奖: Use a configurable prize-card zone with `恭喜获得！`.
- Place the gray secondary action on the left and the red primary action on the right. This reverses the early wireframe order and follows the approved final design.
- Emphasize the configurable draw-count phrase in red while keeping supporting copy gray.

## Dynamic And Fixed Content

| Content | Classification | Rule |
| --- | --- | --- |
| `很遗憾未中奖` | State-fixed | Use only for the losing state. |
| `恭喜获得！` | State-fixed | Use only for the winning state. |
| Prize image/name/amount | Configurable | Keep inside the prize zone; never bake a sample amount into the reusable template. |
| Payment count | Configurable business value | Confirm before delivery. |
| Draw chance count | Configurable business value | Confirm before delivery. |
| Button labels | Approved in this case | Reconfirm if the destination or product flow changes. |

## Reference Assets

- `assets/cases/lottery-result-popup/winner.png`: 1125x1125 PNG with transparency.
- `assets/cases/lottery-result-popup/loser.png`: 1125x1125 PNG with transparency.

The exports are flattened visual references. Prefer the 即时设计 MCP source when it is callable and layer-level information is needed.

## QA Focus

- Confirm the winning asset supports variable prize length and amount.
- Confirm both states share card, copy, and button alignment.
- Confirm transparency is preserved around the popup.
- Confirm the final host screen applies the intended dark overlay.
- Verify all numeric values against the current campaign configuration.

