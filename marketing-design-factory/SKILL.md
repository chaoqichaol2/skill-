---
name: marketing-design-factory
description: Create, revise, and extend exact-size Chinese financial marketing visuals from briefs, Feishu documents, references, and approved assets. Use for 长沙银行、e钱庄、Banner、弹窗、H5、抽奖、立减金、财富礼、存款、权益活动 and related campaign design.
---

# Marketing Design Factory

Create polished Chinese financial-operation visuals with the shortest useful workflow.

## Workflow

1. **Read**
   - Extract exact copy, action, material, target size, fixed claims, assets, and references.
   - Never invent amounts, dates, eligibility, or compliance claims. Ask only when a missing answer changes the claim or size.

2. **Use evidence**
   - Prefer user references and approved campaign assets.
   - For Feishu links, read child pages, nested blocks, image tokens, and downloadable media through Feishu MCP; do not stop at directory text. See `references/feishu-activity-library.md`.
   - Do not search the web unless the user asks.
   - For 长沙银行/e钱庄 slots, confirm dimensions and export limits with `/Users/bcs/.codex/skills/bcs-operation-ad-slots/SKILL.md`.

3. **Generate**
   - First create and select one master KV to lock the hero, palette, material, typography mood, and visual language.
   - For a new or uncertain direction, generate only two or three genuinely different complete master layouts and select the strongest. Do not create more unless requested.
   - After the master KV is selected, generate one new composition per target size by default using the master as the visual reference. Create another version only when the first fails or the user asks.
   - Let the model generate the complete scene and Chinese typography by default. Use the user's copy verbatim, including the benefit, CTA, and small upper-right `广告`.
   - When exact ratio generation is unavailable and the user permits approximation, use the nearest stable fixed ratio, keep all critical content inside a crop-safe area, and report the actual ratio. Never claim it is an exact-size final.

4. **Repair and deliver**
   - Fix wrong text or objects with targeted image edits first.
   - Use controlled overlays only after targeted edits fail, when official logos must be exact, or when editable source is requested.
   - Do not derive another size by cropping, padding, stretching, or mechanically rearranging a finished material. Regenerate the composition from the master KV; leave later cropping to the user only when they explicitly choose that workflow.
   - Check each independently generated material for copy, size, file limit, safe area, and phone-scale readability.
   - Deliver the best image, its path, and only material remaining risks.

## Quality Bar

- Keep one reading path: state/title → benefit/action → CTA, with one dominant hero.
- Match the reference in composition, color, material, typography energy, and visual density.
- Avoid generic gradients, thin system-font overlays, malformed objects, fake UI, random decoration, blue-purple AI glow, and casino or black-gold gambling styling.
- Preserve approved assets. Treat generated brand logos as placeholders unless verified.
- Run `scripts/audit_palette.py` and `scripts/inspect_images.py` only on final candidates.

## Optional References

- Visual review: `references/aesthetic-quality-bar.md`
- User taste: `references/user-aesthetic-profile.md`
- Structured prompt: `references/prompt-contract.md`
- Known Feishu library: `references/feishu-activity-library.md`
- Case-specific references: read only when the brief directly matches the case.
