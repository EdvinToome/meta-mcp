---
name: gemini-prompt-builder
description: Build deterministic Gemini image prompts and variant matrices before generation.
---

Use this when you want prompt planning first and image generation second.

Purpose:
- Build precise generation prompts from facts, brand DNA, and template prompts.
- Produce variant matrix options for human selection.
- Do not generate images in this skill.

Inputs:
- `target_url`
- creative intent
- optional preferred `template_id`
- country/language
- optional matrix size constraints

Required workflow:
1. Call `extract_target_page_facts` for `target_url`.
2. Read:
   - `~/.meta-marketing-plugin/brand_dna_copy.yaml`
   - `~/.meta-marketing-plugin/brand_dna_visual.yaml`
   - `agents/codex/skills/gemini-creative-builder/assets/template-library/index.yaml`
   - chosen prompt file from `agents/codex/skills/gemini-creative-builder/assets/template-library/prompts/`
3. Build `creative_brief` object for generation schema.
4. Build:
   - `base_prompt_full`
   - `base_prompt_visual_only`
5. Create a variant matrix by varying only:
   - hook
   - proof style
   - layout tension
6. Return plan for manual selection before generation.

Output format (JSON):
```json
{
  "selected_template_id": "template_15",
  "template_reason": "...",
  "creative_brief": {
    "objective": "...",
    "audience": "...",
    "awareness_stage": "...",
    "angle": "...",
    "offer": "...",
    "proof_type": "...",
    "cta": "...",
    "landing_page": "https://..."
  },
  "required_reference_images": ["..."],
  "base_prompt_full": "...",
  "base_prompt_visual_only": "...",
  "variants": [
    {
      "variant_id": "v1",
      "hook": "...",
      "proof_style": "...",
      "layout_tension": "...",
      "full_prompt_delta": "...",
      "visual_prompt_delta": "...",
      "recommended_attempts": 1
    }
  ],
  "notes_for_generation": "..."
}
```

Notes:
- Keep prompts specific about text placement, typography feel, color usage, and product fidelity.
- Keep metadata fields out of prompt body unless visually relevant.
