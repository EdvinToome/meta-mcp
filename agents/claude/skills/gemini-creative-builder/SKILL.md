---
name: gemini-creative-builder
description: Orchestrate prompt planning, generation, review, and approval for Gemini ad creatives.
---

Use this when no final image exists and you need prompt planning + generation + approval.

Structure (progressive disclosure):
- `SKILL.md` for workflow rules
- `gemini-prompt-builder` skill for prompt planning
- `references/` + `assets/` for generation constraints and template library

Runtime rules:
- Use Gemini MCP tools only for image generation flow.
- No fallback provider.
- Stop on `gemini_unavailable`, `gemini_auth_failed`, `gemini_quota_exceeded`.
- Do not query Notion at runtime.

Default behavior:
- Use two-phase flow:
  1) prompt planning
  2) generation execution

Execution sequence:
1. Run `gemini-prompt-builder` and return:
   - `selected_template_id`
   - `creative_brief`
   - `required_reference_images`
   - `base_prompt_full`
   - `base_prompt_visual_only`
   - `variants[]` (hook/proof/layout-tension)
2. Ask user which variants to execute and attempts per variant.
3. For each selected variant call `create_creative_generation_batch` with:
   - `template_id`
   - `creative_brief` (required)
   - `reference_images` (required)
   - `full_prompt = base_prompt_full + variant.full_prompt_delta`
   - `visual_only_prompt = base_prompt_visual_only + variant.visual_prompt_delta`
   - selected counts + mode
4. Call `review_creative_batch`.
5. Present options: `select`, `edit`, `start over`, `retry`.
6. Call `approve_creative_candidate`.
7. If approved mode is visual-only: gather final overlay path and call `provide_final_overlay_asset`.

Return contract:
- selected template id + reason
- selected variant ids + attempts
- generation_mode + counts
- exact prompts used
- batch id + approved candidate id
- final image path for publish handoff

Important:
- Keep landing page in `creative_brief` metadata.
- Prompt text should focus on visual instructions only.
