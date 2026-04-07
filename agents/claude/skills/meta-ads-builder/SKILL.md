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
2. Resolve image, `target_url`, budget, status, CTA.
3. Delegate copy generation to subagent `ad-copy-writer` with:
   - `target_url`
   - `creative_description`
   - resolved `site_profile` object (not profile id)
   - quality gates and other return response requirements:
  Require structured return, by default 3 variants, one for tailored to each audience:
   - `copy_context`
   - `description` (`<brand_name_or_domain> | <text>`)
   - `copy_variants` (`parents`, `teachers`, `general`)
   - `copy_variants_english` - same copy variants just translated to english. Since I only speak Enlgish, I need it to understand the copy.
   Quality gate before build:
     - each `primary_text` is multi-line (at least 4 line breaks)
     - includes concrete detail lines (numbers or specific curriculum/content facts)
     - includes an explicit CTA line
     - uses emoji
     - audience variants are materially different, not paraphrases
   - if the gate fails, request a rewrite from `ad-copy-writer` before proceeding
4. Execute `mcp__meta_marketing_plugin__run_structured_ad_build`.
5. Return created IDs, links to ads, ad copies, and ad copies in English and next operator actions. 

Rules:
- Use Meta MCP tools only.
- Do not invent claims or IDs.
