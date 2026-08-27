# Source Capture Workflow

Use this workflow to convert an 即时设计 source file into reusable Skill knowledge. The objective is one-time ingestion followed by local reuse, not repeated MCP inspection.

## Lookup Before MCP

1. Search `case-library-index.json` by case id, campaign name, business type, material type, and aliases.
2. If an entry points to a valid `source-capture.json` with status `complete`, read that capture and its case reference. `complete` means structurally captured; it does not imply final approval, delivery, or unrestricted reuse.
3. Do not call MCP unless the capture is missing, partial, stale, or the user explicitly requests synchronization.

## Read Scope

Read without modifying the source document:

- source file name and stable source identifier when available
- current page and selected frame identifiers
- frame names, roles, positions, dimensions, and aspect ratios
- parent-child layer tree and layer order
- layer names, types, visibility, lock state, bounds, opacity, blend mode, masks, and clipping behavior
- exact text, font family, weight, size, line height, alignment, colour, effects, and maximum observed line count
- fills, gradients, strokes, corner radii, shadows, blur, and reusable component or group identifiers
- image layers and whether a reusable export was captured
- main visual, extension frames, shared layers, state-specific layers, and per-size additions/removals
- dynamic fields such as prize, amount, date, eligibility, button copy, and whether each field is fixed or configurable
- safe areas, upper-right `广告` placement, logo placement, CTA hierarchy, and crop behavior

If the bridge cannot return a field, store `null` or `unknown`; never invent it from appearance alone.

## Normalized Capture

Write `assets/cases/<case-id>/source-capture.json` with this shape:

```json
{
  "schema_version": 1,
  "case_id": "lowercase-hyphen-id",
  "case_name": "Chinese campaign name",
  "classification": ["中文", "互联网", "金融类"],
  "capture_status": "complete",
  "approval_status": "unreviewed",
  "delivery_status": "unknown",
  "reuse_scope": "not-reusable",
  "source": {
    "platform": "jsdesign",
    "capture_mode": "mcp",
    "captured_at": "ISO-8601 timestamp",
    "file_name": "source file name",
    "file_id": null,
    "page_name": "page name",
    "page_id": null,
    "selection_scope": "selected-frames",
    "fingerprint": null
  },
  "frames": [
    {
      "id": "source frame id",
      "name": "frame name",
      "role": "main-visual",
      "width": 1035,
      "height": 300,
      "x": 0,
      "y": 0,
      "layer_count": 0,
      "layers": []
    }
  ],
  "shared_style": {
    "palette": [],
    "typography": [],
    "effects": [],
    "hero_groups": [],
    "cta_styles": [],
    "advertising_label": {}
  },
  "extension_rules": [],
  "dynamic_fields": [],
  "stored_assets": [],
  "unknown_fields": [],
  "notes": []
}
```

Allowed status values:

- `complete`: selected source and relevant extension frames were read and the capture validates
- `partial`: MCP read succeeded but important frames or fields remain missing
- `flattened`: only exported raster references were available
- `stale`: the source changed after the last capture or a refresh was requested but not completed

Keep these independent status axes:

- `approval_status`: `approved-final`, `provisional-template`, or `unreviewed`
- `delivery_status`: `delivered`, `not-delivery-evidence`, `not-delivered`, or `unknown`
- `reuse_scope`: `global-aesthetic-reference`, `case-pattern`, `source-template-only`, or `not-reusable`

For an unfinished source page, use `partial` and add a `capture_progress` object with non-empty `completed_sections` and `pending_sections`. Do not read, promote, or overwrite unfinished sections merely to make the capture appear complete. Preserve the last-good capture and refresh only after the user explicitly states that the page or section is ready.

## Case Reference

Write or update `references/case-<case-id>.md` with concise reusable conclusions rather than duplicating the entire JSON:

- business and material roles
- source of truth and capture date
- main visual frame and extension frame mapping
- fixed versus dynamic content
- reusable composition rules
- per-aspect-ratio recomposition behavior
- typography, CTA, advertising label, palette, lighting, and material rules
- known discrepancies between requirement, source, and final delivery
- explicit user preferences learned from the case

## Case Index

Update `case-library-index.json` in the same task. Keep one entry per case with:

- case id, name, aliases, and tags
- reference path and capture path
- capture status, approval status, delivery status, reuse scope, and capture date
- source platform and available frame dimensions
- short retrieval hints

Never mark an entry complete solely because the MCP connection succeeded. Validate the stored capture first. Never use `complete` as a synonym for `approved-final` or `delivered`.

## Reuse Rule

For future design tasks, read the index and matching capture. Do not reconnect to 即时设计 merely to remind yourself of previously captured data. Reconnect only for explicit refresh, source changes, missing source knowledge, or a requested write operation.
