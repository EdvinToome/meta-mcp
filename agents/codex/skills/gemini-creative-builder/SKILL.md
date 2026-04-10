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
- `create_creative_generation_batch.generation_mode` must be `interactive` or `deferred_batch` only.
- Do not pass `full_only` or `visual_only` as `generation_mode`.

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
4. For each selected variant call `create_creative_generation_batch` with:
   - `reference_images` (required)
   - `full_prompt = variant.full_prompt`
   - `visual_only_prompt = variant.visual_only_prompt`
   - `generation_mode` set to `interactive` by default (use `deferred_batch` only if explicitly requested)
   - selected counts:
     - full-only request: `full_count > 0`, `visual_only_count = 0`
     - visual-only request: `full_count = 0`, `visual_only_count > 0`
     - both request: `full_count > 0`, `visual_only_count > 0`
   - optional audit metadata: `template_id`, `creative_brief`, `concept`, `creative_description`, `overlay_text`, `plan_notes`
5. Call `review_creative_batch`.
6. Present options: `select`, `edit`, `start over`, `retry`.
7. Call `approve_creative_candidate`.
8. If approved mode is visual-only: gather final overlay path and call `provide_final_overlay_asset`.

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
