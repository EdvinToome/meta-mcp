---
name: meta-ads-builder
description: Build Meta campaign + ad set + creative + ad from one resolved brief.
---

Use this for campaign publishing.

Read:
- `~/.meta-marketing-plugin/site-profiles.local.json`

Workflow:
1. Resolve `site_profile` from global profiles.
2. Resolve campaign-level inputs and creative-level inputs:
   - campaign-level: budget, status, CTA, countries, page/pixel identity
   - creative-level: image, `target_url`, `creative_description`
   - If `image_path` or `image_hash` is provided, continue directly to publish.
   - If image is missing:
     - first delegate to subagent `gemini_prompt_builder` for prompt plan + variant matrix
     - then let operator choose variants and attempts
     - then delegate to subagent `gemini_image_writer` for generation execution
   - Do not call publish flow before explicit candidate approval.
3. Build campaign, ad set and ad names with this required format:
   - `Brand | Country | Date | Description`
   - Date format: `YYYY-MM-DD`
   - Description is free-form and concise 2-4 words.
   - Use different description focus by level.
   - for multiple creatives in one request:
     - use one shared `campaign_name`
     - create one unique `ad_set_name`, `creative_name`, and `ad_name` per creative
4. For each creative, delegate copy generation to subagent `ad_copy_writer` separately (one subagent call per creative):
   - required input per call:
     - `target_url` for that creative
     - `creative_description` for that creative
     - resolved `site_profile` object (not profile id)
   - required output per call:
     - `description` (`<domain> | <text>`)
     - `copy_variants` (`parents`, `teachers`, `general`)
   - quality gate per call before build:
     - each `primary_text` is multi-line (at least 4 line breaks)
     - includes concrete detail lines (numbers or specific curriculum/content facts)
     - includes an explicit CTA line
     - uses emoji
     - audience variants are materially different, not paraphrases
   - if the gate fails for a creative, request a rewrite from `ad_copy_writer` for that creative before proceeding
   - keep strict one-to-one mapping: creative N -> copy output N -> build item N
5. Build `run_structured_ad_build.builds` with one build item per creative:
   - pass `builds` as a real JSON array, not a stringified JSON value
   - each item must include that creative's own `image_path`/`image_hash`, `target_url`, and `copy_variants`
   - keep the same `campaign_name` across items when the intent is one campaign with multiple ad sets
   - keep strict one-to-one mapping: creative N -> `copy_variants` N -> build item N -> ad set N
6. Execute `mcp__meta_marketing_plugin__run_structured_ad_build` only after image is resolved and pass:
   - `language` from `site_profile.language`
   - `country` from `site_profile.country`
7. Return created IDs, links to ads, and for each audience variant include:
   - original `headline` and `primary_text`
   - English translation of `headline` and `primary_text`
   - next operator actions

Gemini subagent contract:
- Prompt builder (`gemini_prompt_builder`) output:
  - `selected_template_id`
  - `creative_brief`
  - `required_reference_images`
  - `base_prompt_full`
  - `base_prompt_visual_only`
  - `variants[]` with `hook`, `proof_style`, `layout_tension`, prompt deltas, and recommended attempts
- Generation executor (`gemini_image_writer`) path per selected variant:
  - call `create_creative_generation_batch` with required:
    - `template_id`
    - `creative_brief`
    - `reference_images`
    - prompts composed from base + variant deltas
  - `review_creative_batch`
  - `approve_creative_candidate`
  - `provide_final_overlay_asset` when approved candidate is visual-only

Rules:
- Use Meta MCP tools only.
- Do not invent profile IDs or claims.
- Stop on missing required inputs.
- Since we use dynamic creative ad sets, each ad set can only have exactly one ad.
