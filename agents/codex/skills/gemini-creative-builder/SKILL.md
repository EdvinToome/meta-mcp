---
name: gemini-creative-builder
description: Generate, review, and approve Gemini ad creative images before Meta publishing.
---

Use this when no final image is available yet.

Runtime policy:
- Use Gemini MCP tools only.
- No provider fallback.
- Stop on Gemini availability/auth/quota errors.

Workflow:
1. Select one local template id from `templates/index.yaml`.
   - Load only the chosen template file and relevant example README.
   - Reuse guidance from `static-banner-heuristics.md`.
2. Build the generation plan:
   - `concept`
   - `template_id`
   - `full_count` and `visual_only_count`
   - `generation_mode` (`interactive` or `deferred_batch`)
3. Run `create_creative_generation_batch`.
4. Review candidates with `review_creative_batch`.
5. Ask operator to choose:
   - `select <candidate_id>`
   - `edit <candidate_id>: <prompt_delta>`
   - `start over`
6. Approve with `approve_creative_candidate`.
7. If approved candidate mode is `visual_only`, collect final composed image path and call `provide_final_overlay_asset`.
8. Return approved image path for downstream Meta publish flow.

Prompt rules:
- Build prompts from local template files only.
- Source of truth: local files in this skill directory.
- Notion can be used only for manual authoring updates, never runtime retrieval.
- Apply hardening blocks: composition, camera, lighting, quality, negative constraints.
- Persist and show exact prompt per candidate.
