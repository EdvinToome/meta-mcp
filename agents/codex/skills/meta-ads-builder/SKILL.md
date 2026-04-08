---
name: meta-ads-builder
description: Build Meta campaign + ad set + creative + ad from one resolved brief.
---

Use this for campaign publishing.

Read:
- `~/.meta-marketing-plugin/site-profiles.local.json`

Workflow:
1. Resolve `site_profile` from global profiles.
2. Resolve image strategy, `target_url`, budget, status, CTA.
   - If `image_path` or `image_hash` is provided, continue directly to publish.
   - If image is missing, run generation first through Gemini MCP tools:
     - `create_creative_generation_batch`
     - `review_creative_batch`
     - `approve_creative_candidate`
     - `provide_final_overlay_asset` (only for visual-only approvals)
   - Do not call publish flow before explicit candidate approval.
3. Build campaign, ad set and ad names with this required format:
   - `Brand | Country | Date | Description`
   - Date format: `YYYY-MM-DD`
   - Description is free-form and concise 2-4 words.
   - Use different description focus by level.
4. Delegate copy generation to subagent `ad_copy_writer` with:
   - `target_url`
   - `creative_description`
   - resolved `site_profile` object (not profile id)
   - quality gates and other return response requirements:
  Require structured return, by default 3 variants, one for tailored to each audience, provide the agent with:
   - `description` (`<domain> | <text>`)
   - `copy_variants` (`parents`, `teachers`, `general`)
   - `copy_variants_english`  - same copy variants just translated to english. Since I only speak Enlgish, I need it to understand your copy.
   - quality gate before build:
     - each `primary_text` is multi-line (at least 4 line breaks)
     - includes concrete detail lines (numbers or specific curriculum/content facts)
     - includes an explicit CTA line
     - uses emoji
     - audience variants are materially different, not paraphrases
   - if the gate fails, request a rewrite from `ad_copy_writer` before proceeding
5. Execute `mcp__meta_marketing_plugin__run_structured_ad_build` only after image is resolved and pass:
   - `language` from `site_profile.language`
   - `country` from `site_profile.country`
6. Return created IDs, links to ads, ad copies, and ad copies in English and next operator actions. 

Rules:
- Use Meta MCP tools only.
- Do not invent profile IDs or claims.
- Stop on missing required inputs.
