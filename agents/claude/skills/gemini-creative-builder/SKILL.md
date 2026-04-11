---
name: gemini-creative-builder
description: Orchestrate prompt planning and Gemini image generation for ad creatives.
---

Use this when no final image exists and you need prompt planning + generation.

Structure (progressive disclosure):
- `SKILL.md` for workflow rules
- `gemini-prompt-builder` skill for prompt planning
- `references/` + `assets/` for generation constraints and template library

Runtime rules:
- Use Gemini MCP tools only for image generation flow.
- No fallback provider.
- Stop on `gemini_unavailable`, `gemini_auth_failed`, `gemini_quota_exceeded`.
- Do not query Notion at runtime.
- Gemini generation tools are:
  - `health_check`
  - `create_image`
- `create_image.generation_mode` must be `default` or `async`.
- `create_image.resolution` must be `1K`, `2K`, or `4K`.

Default behavior:
- Use two-phase flow:
  1) prompt planning
  2) generation execution

Execution sequence:
1. Always run the `gemini-prompt-builder` subagent before planning or generation. Do not replace this with local planning.
2. Return the subagent plan:
   - `selected_template_id`
   - `creative_brief`
   - `required_reference_images`
   - `base_prompt_full`
   - `base_prompt_visual_only`
   - `variants[]` with `hook`, `proof_style`, `layout_tension`, `full_prompt`, `visual_only_prompt`, and `recommended_attempts`
3. Ask user which variants to execute and attempts per variant.
4. Run `health_check` once before the first generation call.
5. For each selected variant, call `create_image` per prompt type needed:
   - Full mode call:
     - `prompt = variant.full_prompt`
   - Visual-only mode call:
     - `prompt = variant.visual_only_prompt`
   - Shared params for every call:
     - `count` from attempts (or explicit user override)
     - `aspect_ratio` from user choice (default `1:1`)
     - `attachments` from required reference images when needed; otherwise `[]`
     - `generation_mode` default `default` (use `async` only if user asks)
     - `resolution` default `1K` (use `2K`/`4K` when requested)
6. Present generated image paths and exact prompts for user selection.

Return contract:
- selected template id + reason
- selected variant ids + attempts
- generation_mode + resolution + aspect_ratio
- exact prompts used per `create_image` call
- output folders + image paths for publish handoff

Important:
- Keep landing page in `creative_brief` metadata.
- Prompt text should focus on visual instructions only.
