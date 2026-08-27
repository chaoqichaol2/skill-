# Aesthetic Quality Bar

Use this reference for visual-direction blueprints, prompts, draft review, controlled composition, and preference calibration.

## Mandatory Classification

Apply the fixed tags `中文 / 互联网 / 金融类` to every case, prompt, blueprint, review, and delivery record. Keep the tags as metadata unless the user explicitly asks to display them inside the artwork.

- `中文`: use Chinese-first reading order, accurate Chinese typography, domestic mobile-product hierarchy, and phone-scale readability.
- `互联网`: use contemporary digital-product composition, efficient information delivery, approachable operation language, and controlled visual freshness.
- `金融类`: convey trust, clarity, security, restraint, and credible benefit communication.

The intended visual intersection is a Chinese internet-finance operation design. It is not a casino/game reward screen, generic ecommerce sale, overseas fintech template, or traditional printed bank brochure.

## Production Mode

1. Default to full-layout generation, including Chinese typography atmosphere, benefit copy, CTA, and the upper-right `广告`.
2. For a new master direction, generate two or three internal candidates and present only the strongest one. After the master is selected, generate one extension per size by default.
3. Verify every generated word, number, CTA, logo, and compliance label.
4. Repair only the incorrect area. Use controlled composition when targeted generation fails or editable delivery is required.

## Visual-DNA Blueprint

Specify every item before generation:

- composition: focal point, visual path, asymmetry/symmetry, foreground/midground/background
- subject scale: approximate percentage of canvas width and height
- negative space: exact zones reserved for copy and CTA
- palette: 3–5 dominant colors and their approximate usage ratio
- lighting: direction, softness, intensity, and number of glow sources
- materials: matte/gloss/translucent/metallic behavior and which objects use them
- information density: low/medium/high with a maximum decoration count
- typography role: hierarchy, alignment, approximate line count, and weight; generate it as part of the scene by default and use controlled text only for repair or editable delivery
- reference borrowing: one concise list of approved traits per reference
- rejection list: one concise list of traits that must not appear

Do not approve vague descriptions such as `高级`, `高级感`, `有质感`, `大气`, or `科技感` without the concrete constraints above.

## Hard-Fail Conditions

Reject and regenerate before showing the user when any condition is present:

- generated Chinese headline, CTA, prize amount, rules, or `广告` are incorrect, garbled, or unreadable
- giant beveled, extruded, glowing, or metallic headline dominates the canvas without an approved campaign reference or a clear festival-promotion reason
- black-and-gold casino styling appears without explicit user approval
- all major elements glow or use glossy 3D material
- oversized gradient pill CTA becomes the largest or second-largest visual object
- energy rings, confetti, coins, particles, flares, and rays compete simultaneously
- every element is vertically centered with no deliberate negative space or visual tension
- the result looks more like a mobile game reward screen than a bank operation design
- the result does not clearly fit the fixed classification `中文 / 互联网 / 金融类`
- the reference's composition, restraint, or material language is lost and only its object remains
- the design becomes unreadable or visually crowded at phone scale
- obvious AI-generated artifacts appear: malformed objects, inconsistent perspective, conflicting shadows, plastic-like over-smoothing, fake UI fragments, random floating icons, meaningless micro-details, duplicated decorations, or incoherent material transitions
- the palette contains unsupported neon blue/purple, dirty hue mixing, accidental color contamination, equal-weight rainbow hues, or a strange color that cannot be traced to the brand, approved reference, business theme, or scene

## AI Trace And Color Check

Before showing a draft, verify:

- every object has coherent geometry, perspective, scale, and contact/ambient shadow
- decorative elements support the business idea rather than fill empty space randomly
- material rendering is concentrated on the hero instead of making the entire image look like glossy plastic
- the background, hero, and accents share one lighting environment
- the palette has one dominant color family, one supporting family, and limited accents
- no more than two high-saturation hue families carry equal visual weight; native brand-logo colors may appear as small exceptions
- blue is scene- or brand-supported; avoid default AI-tech electric blue, deep neon blue, or blue-purple cyber glow
- gradients remain clean and intentional without muddy transitions or unexpected green/purple/cyan contamination

Run `python3 scripts/audit_palette.py <image>` after this visual inspection. The script reports dominant colours, saturated coverage, separated high-saturation hue families, and bright blue/violet coverage. Its result is advisory: a warning is acceptable only when it is explicitly supported by the approved palette blueprint, brand colour, or scene. A low automated risk never overrides visible AI artifacts or an incoherent palette.

## Review Rubric

Score a composed draft before presenting it:

- composition and reading path: 25
- reference fidelity without literal copying: 20
- banking tone and restraint: 20
- typography, spacing, and CTA hierarchy: 20
- material, lighting, and detail control: 15

Apply hard-fail checks for AI trace and color before calculating the score.

Require at least 80/100 and no hard-fail condition. A score cannot override a hard fail.

## Default Restraint Rules

- Use one dominant hero object.
- Use one primary glow or lighting system.
- Limit decorative particle types to one and keep them subordinate.
- Use no more than one glossy material family.
- Prefer neutral or lightly tinted copy over gold extrusion.
- Keep CTA visually clear but smaller than the hero and headline hierarchy combined.
- Use depth through scale, overlap, blur, and contrast instead of outlining every object.
- Preserve at least one meaningful quiet area; do not fill every corner.

## Preference Calibration Record

When the user reviews a visual, capture:

- verdict: liked / disliked / mixed
- composition: what worked or failed
- color: what worked or failed
- typography: what worked or failed
- material and lighting: what worked or failed
- marketing intensity: too weak / appropriate / too strong
- banking tone: too casual / appropriate / too conservative
- specific keep: elements to preserve
- specific avoid: elements never to repeat

Only convert repeated feedback into a global rule after two independent cases, unless the user explicitly declares it a permanent preference.
