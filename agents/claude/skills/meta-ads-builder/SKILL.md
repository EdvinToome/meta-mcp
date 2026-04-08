---
name: meta-ads-builder
description: Build Meta campaign + ad set + creative + ad from one resolved brief.
---

Use this for campaign publishing in Claude.
Primary entry command: `/meta-ads-builder`.

Read:
- `.claude/meta-marketing-plugin/site-profiles.local.json`

Workflow:
1. Resolve `site_profile` from project profiles.
2. Resolve campaign-level inputs and creative-level inputs:
   - campaign-level: budget, status, CTA, countries, page/pixel identity
   - creative-level: image, `target_url`, `creative_description`
3. Build campaign, ad set and ad names with this required format:
   - `Brand | Country | Date | Description`
   - Date format: `YYYY-MM-DD`
   - Description is free-form and concise 2-4 words.
   - Use different description focus by level.
   - for multiple creatives in one request:
     - use one shared `campaign_name`
     - create one unique `ad_set_name`, `creative_name`, and `ad_name` per creative
4. For each creative, delegate copy generation to subagent `ad-copy-writer` separately (one subagent call per creative):
   - required input per call:
     - `target_url` for that creative
     - `creative_description` for that creative
     - resolved `site_profile` object (not profile id)
   - required output per call:
     - `description` (`<domain> | <text>`)
     - `copy_variants` (`parents`, `teachers`, `general`)
     - `copy_variants_english` - same copy variants translated to English for operator readability
   - quality gate per call before build:
     - each `primary_text` is multi-line (at least 4 line breaks)
     - includes concrete detail lines (numbers or specific curriculum/content facts)
     - includes an explicit CTA line
     - uses emoji
     - audience variants are materially different, not paraphrases
   - if the gate fails for a creative, request a rewrite from `ad-copy-writer` for that creative before proceeding
   - keep strict one-to-one mapping: creative N -> copy output N -> build item N
5. Build `run_structured_ad_build.builds` with one build item per creative:
   - each item must include that creative's own `image_path`/`image_hash`, `target_url`, and `copy_variants`
   - keep the same `campaign_name` across items when the intent is one campaign with multiple ad sets
   - keep strict one-to-one mapping: creative N -> `copy_variants` N -> build item N -> ad set N
6. Execute `mcp__meta_marketing_plugin__run_structured_ad_build` using those build items and pass:
   - `language` from `site_profile.language`
   - `country` from `site_profile.country`
7. Return created IDs, links to ads, ad copies, and ad copies in English and next operator actions. 

Rules:
- Use Meta MCP tools only.
- Do not invent claims or IDs.
