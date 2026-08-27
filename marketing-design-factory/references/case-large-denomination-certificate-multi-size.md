# Case: Unit Large-denomination Certificate Multi-size Extension

Use this case for 单位大额存单 and similar enterprise-channel product campaigns that extend one red financial visual system into a banner, header, popup, and ultra-wide web banner.

## Confirmed Brief

- Product title: `单位大额存单`
- Benefit copy: `1000万起存`、`收益有保障`、`可转让`
- CTA: `查看详情`
- Direction: reference the earlier structured-deposit composition and use red as the primary color.
- The user explicitly stated that the dimensions in the requirement sheet are wrong. For this case, the supplied final-file dimensions are authoritative; retain the sheet only as historical input.
- Source available here: requirement screenshot plus flattened final PNG exports. Do not infer editable layer structure.

## Authoritative Final Exports

| Role | User-confirmed final size | Shape/specification from brief | File-size result |
| --- | ---: | --- | --- |
| 企业手机银行首页 Banner 1 / 第一屏 | 1029×330 | 24 px radius; PNG/JPEG | 460,197 bytes; under recommended 800 KB |
| 企业手机银行首页顶部 Banner | 1125×997 | curved bottom; PNG/JPEG | 1,184,250 bytes; over recommended 800 KB |
| 企业手机银行首页中心弹窗 | 800×800 | 20 px radius; PNG/JPEG | 315,405 bytes; under recommended 800 KB |
| 企业网银活期账户总览 Banner | 1644×214 | 6 px radius; PNG/JPEG | 321,277 bytes; under recommended 800 KB |

The brief listed the header as 1170×273, but the user supplied 1125×997 as the correct final dimension. Validate the case against 1125×997. The 800 KB value is phrased as a recommendation, so the header file produces a warning rather than a delivery-dimension failure; preserve the original asset and do not compress it without a request.

## Visual System

- Red-to-orange gradient communicates promotion while retaining a financial-product tone.
- Large bold italic white title with a yellow lightning/arrow accent.
- A layered `1000万` deposit-certificate card is the main hero object.
- Upward chart, grid, shield, and warm light reinforce value, growth, and security.
- White-to-pale-red CTA pill keeps the action legible against the saturated background.
- Keep `广告` visible in the channel-required area.

## Composition By Slot

### 1029×330 master banner

- Use a horizontal text-left / hero-right layout.
- Keep title, all three benefit points, and CTA visible.
- Use the chart line and perspective floor to connect both sides without competing with the copy.

### 1644×214 ultra-wide banner

- Compress the full hierarchy into a shallow strip instead of uniformly shrinking the master.
- Keep the content group centered within the long desktop canvas and retain a compact CTA.
- Reduce the hero object and decorative chart density to protect title readability.

### 800×800 popup

- Recompose vertically: title and benefit line at the top, hero object in the center, CTA at the bottom.
- Use the product certificate itself to carry the `1000万` benefit cue.
- Preserve transparent surroundings and avoid adding a long rule stack.

### 1125×997 header

- Preserve a large atmospheric red field above the content.
- Concentrate title, benefit line, hero object, chart, and CTA near the curved lower section.
- Treat this as the approved delivery pattern for this case, not as a replacement for the external 1170×273 specification.

## Reference Assets

- `../assets/cases/large-denomination-certificate-multi-size/requirement.png`
- `../assets/cases/large-denomination-certificate-multi-size/enterprise-mobile-home-banner_1029x330.png`
- `../assets/cases/large-denomination-certificate-multi-size/enterprise-mobile-home-header-final_1125x997.png`
- `../assets/cases/large-denomination-certificate-multi-size/enterprise-mobile-home-popup_800x800.png`
- `../assets/cases/large-denomination-certificate-multi-size/enterprise-online-current-account-banner_1644x214.png`
- Machine-checkable requirements: `../assets/cases/large-denomination-certificate-multi-size/manifest.json`

## Repeated Pattern Confirmed Across Two Cases

This case and the unit fixed-deposit case independently confirm that multi-size campaign work requires role-specific recomposition rather than proportional scaling. This pattern is now promoted into the core Production Rules.

Do not merge the products' business claims: `1万起存` belongs to the fixed-deposit case, while `1000万起存`、`收益有保障`、`可转让` belong to this large-denomination-certificate case.

## Optimization Backlog

- Determine from future cases whether 1125×997 is a stable host-page delivery canvas; it has now appeared in two approved cases but conflicts with the external 1170×273 specification.
- If the publishing system enforces 800 KB despite the wording `recommended`, create and compare a compressed header export while preserving the original.
- Add text safe areas and editable-layer rules when 即时设计 MCP source structure becomes available.
- Record whether the hero object should keep embedded benefit text or use a separate configurable text layer in future campaigns.
