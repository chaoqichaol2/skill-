# Prompt Contract

Use this file only when a structured prompt will improve generation. Do not create Prompt V0/V1 approval stages by default.

## Modes

### Integrated full-layout generation

Use by default for fast campaign design. Ask the model to generate:

- background and atmosphere
- hero object and supporting decoration
- exact Chinese headline and benefit copy
- CTA and typography effects
- small upper-right `广告`

For a new master direction, generate two or three candidates, compare them internally, and present only the strongest one. After the master is selected, generate one extension per target size by default.

### Material-only generation

Use only when the user requests editable composition, when official logos or dynamic fields must remain separate, or when integrated text repeatedly fails. Generate the visual material, then add the required controlled layers.

## Required Prompt Fields

1. `Design classification`: `中文 / 互联网 / 金融类`
2. `Business role`: exposure, reminder, result state, conversion, or another explicit role
3. `Asset`: channel, exact size, and material type
4. `Exact copy`: every required line verbatim, including numerals and CTA
5. `Reference roles`: what each supplied reference contributes and what must not be copied
6. `Scene and hero`: one dominant idea with foreground, midground, and background
7. `Composition`: copy/hero allocation and reading path
8. `Palette`: one dominant family, one supporting family, and limited accents
9. `Typography atmosphere`: hierarchy, display style, contrast, and intended energy
10. `CTA and advertising label`: placement and visual priority
11. `Decoration budget`: normally one or two supporting families
12. `Avoid`: case-specific failures and the permanent negative block

## Copyable Template

```text
Use case: ads-marketing
Design classification: 中文 / 互联网 / 金融类
Business role: [role and user action]
Asset: [channel and exact size]

Exact Chinese copy:
- [headline]
- [benefit]
- CTA: [text]
- Advertising label: 广告

Reference roles:
- Reference A: borrow [composition/material/hero]; reject [unrelated content].
- Reference B: borrow [palette/typography/atmosphere]; reject [unrelated content].

Create a complete Chinese financial-operation campaign visual.

Scene and hero:
[one dominant visual idea]

Composition:
[copy zone, hero zone, reading path, safe areas]

Palette:
[dominant, supporting, neutral, small accents]

Typography atmosphere:
[Chinese display type, number emphasis, outline/shadow/3D treatment, readability]

CTA:
[position, shape, hierarchy]

Decoration budget:
[maximum types and placement]

Avoid:
No obvious AI-generated look; no malformed geometry; no inconsistent perspective or shadows; no fake UI fragments; no random floating icons; no cyber-blue or blue-purple neon glow unless supported; no casino, slot-game, arcade, or gambling mood; no dirty color mixing; no equal-weight rainbow palette; no excessive glossy plastic; no garbled Chinese; no misspelled CTA; no inaccurate amount; no fake final-delivery logo.
```

## Pre-Generation Check

- Copy is exact and does not invent a financial claim.
- References have distinct, traceable roles.
- The idea is specific enough to avoid a generic gradient-and-object result.
- Typography is part of the composition, not an afterthought.
- Master-KV candidates differ in composition or visual metaphor, not only color.
- Extensions reuse the selected master visual language and default to one generated composition per size.
- When the user permits a nearby fixed ratio, keep all critical content inside the later crop-safe area and report the actual ratio.
- Official logos are supplied or clearly treated as concept placeholders.
