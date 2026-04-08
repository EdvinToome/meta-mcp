---
name: gemini-creative-builder
description: Plan and generate Gemini ad creatives with local template knowledge, then run review/approval before Meta publish.
---

Use this when no final image exists and you need generation + approval.

Structure (progressive disclosure):
- `SKILL.md` for workflow rules
- `references/` for methodology and Notion-derived guidance
- `assets/` for template catalog and prompt blocks

Runtime rules:
- Use Gemini MCP tools only for image generation flow.
- No fallback provider.
- Stop on `gemini_unavailable`, `gemini_auth_failed`, `gemini_quota_exceeded`.
- Do not query Notion at runtime.

Default behavior:
- Build generation plan automatically.
- Do not ask the user for template/count/mode unless user asks for manual control.

Plan builder requirements:
1. Read:
   - `references/notion-workflow.md`
   - `references/static-banner-rules.md`
   - `assets/template-library/index.yaml`
   - selected template prompt files from `assets/template-library/prompts/`
2. Pick template from local index based on creative brief.
3. Set defaults:
   - `generation_mode=interactive`
   - `full_count=2`
   - `visual_only_count=2`
4. Build two standalone prompts:
   - `full_prompt`
   - `visual_only_prompt`
5. Include hardening blocks:
   - composition hierarchy
   - camera + lighting intent
   - quality + artifact suppression
   - conversion/readability constraints
   - scroll-stop mechanism from static-banner rules

Execution sequence:
1. `create_creative_generation_batch`
2. `review_creative_batch`
3. Present options: `select`, `edit`, `start over`
4. `approve_creative_candidate`
5. if mode is visual-only: gather final overlay path, call `provide_final_overlay_asset`

Return contract:
- selected template id + reason
- generation_mode + counts
- exact prompts used
- batch id + approved candidate id
- final image path for publish handoff
