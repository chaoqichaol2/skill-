# Case: Unit Fixed Deposit Multi-size Extension

Use this case for 单位定期存款、企业手机银行、企业网银 and similar financial-product campaigns that start from one horizontal banner and extend into several operation-slot shapes.

## Case Purpose

This case demonstrates controlled recomposition from one approved visual system. It is not a proportional-resize example: each slot preserves the campaign identity while changing hierarchy, density, and object placement for its role.

## Confirmed Brief

- Product title: `单位定期存款`
- Benefit copy: `1万起存`、`期限丰富`、`本息保障`、`锁定收益`
- CTA used in the approved exports: `查看详情`
- Direction: reference the existing in-app fixed-deposit design and color palette.
- Historical requested completion date: July 9. Treat this as case history, never as a reusable deadline.
- Source available here: requirement screenshot plus flattened PNG exports. Do not infer editable layer structure.

## Required Slots And Export Check

| Role | Original brief size | Shape/specification | Confirmed final export | Status |
| --- | ---: | --- | ---: | --- |
| 企业手机银行首页 Banner 1 | 1029×330 | 24 px radius; PNG/JPEG; recommended ≤800 KB | 1029×330 | Match |
| 企业手机银行首页头部区域 | 1170×273 | curved bottom; PNG/JPEG; recommended ≤800 KB | 1125×997 | User-confirmed final delivery |
| 企业手机银行首页中心弹窗 | 800×800 | 20 px radius; PNG/JPEG; recommended ≤800 KB | 800×800 | Match |
| 企业网银活期账户页下方 Banner | 1644×214 | 6 px radius; PNG/JPEG; recommended ≤800 KB | 1644×214 | Match |

The original requirement listed the header area as 1170×273, while the supplied 1125×997 file was confirmed by the user as the actual final delivery. Preserve both facts: validate this case against 1125×997, and retain 1170×273 as a requirement-to-delivery variance rather than silently rewriting the original brief.

## Visual System

- Orange-to-gold financial promotion palette with white highlight type.
- Large bold italic title, with a coin/star accent integrated into the lettering.
- Gold hourglass, shield, and coins as the primary product metaphor: time, security, and return.
- White/gold waves, light trails, particles, and dotted matrices create depth and continuity.
- Red-orange gradient pill CTA with a bright outline.
- Keep the `广告` label visible where the channel requires it.

## Composition By Slot

### 1029×330 master banner

- Use the complete hierarchy: title and benefits on the left, hero object on the right, CTA below the copy.
- Preserve enough contrast behind the white title and retain the four benefit points.
- Treat this as the clearest horizontal master for later adaptations in this case.

### 1644×214 ultra-wide banner

- Compress vertical spacing and reduce decorative height rather than shrinking every element uniformly.
- Keep the text group near the visual center-left and the hero object near center-right.
- Retain title, benefits, and CTA because the width supports the complete message.

### 800×800 popup

- Recompose vertically: title at top, hero object in the middle, CTA at bottom.
- Omit the benefit row when it competes with title, hero, and CTA at phone scale.
- Preserve transparent surroundings and the approved popup silhouette when delivering a cutout asset.

### Header area

- Concentrate the campaign content near the curved lower edge and preserve the large background field required by the host page.
- In this approved case, use the tall 1125×997 final canvas and keep the campaign content concentrated near its lower curved region.
- Do not generalize 1125×997 into a channel standard; the original brief and the BCS slot specification still record 1170×273.

## Reference Assets

- `../assets/cases/fixed-deposit-multi-size/requirement.png`
- `../assets/cases/fixed-deposit-multi-size/enterprise-mobile-home-banner_1029x330.png`
- `../assets/cases/fixed-deposit-multi-size/enterprise-mobile-home-popup_800x800.png`
- `../assets/cases/fixed-deposit-multi-size/enterprise-online-current-account-banner_1644x214.png`
- `../assets/cases/fixed-deposit-multi-size/enterprise-mobile-home-header-final_1125x997.png`
- Machine-checkable requirements: `../assets/cases/fixed-deposit-multi-size/manifest.json`

## Reusable Lessons

- Extend by role-specific recomposition, not by proportional scaling.
- Keep the campaign identity stable through palette, title treatment, hero object, light effects, and CTA styling.
- Decide which information can be omitted per slot; do not force all banner copy into a popup.
- Compare the requirement sheet with actual exports automatically before visual approval.

Keep these lessons at the case level until another independent case confirms the same pattern or the user declares them a standard.

## Optimization Backlog

Leave this section open for future approved cases and source-file evidence:

- Determine from future cases whether the 1125×997 header delivery is a project-specific host-page canvas or a repeatable production pattern.
- Record text safe areas and minimum readable sizes after more phone-scale examples are supplied.
- Record repeatable title, hero-object, and CTA placement ranges only after at least one more multi-size campaign.
- Add source-layer or 即时设计 node rules if the MCP bridge exposes reliable structure in a future task.
