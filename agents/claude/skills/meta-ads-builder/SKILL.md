---
name: meta-ads-builder
description: Build Meta campaign + ad set + creative + ad from one resolved brief.
---

Use this for campaign publishing in Claude.
Primary entry command: `/meta-ads-builder`.

Read:
- `.claude/meta-marketing-plugin/site-profiles.local.json`
- `.claude/meta-marketing-plugin/brand_dna.yaml`

Workflow:
1. Resolve `site_profile` from project profiles.
2. Resolve image, `target_url`, budget, status, CTA.
3. Delegate copy to subagent `ad-copy-writer` with, by default 3 variants, one for each audience:
   - `target_url`
   - `creative_description`
   - `site_profile`
4. Require:
   - `copy_context`
   - `copy_variants` (`parents`, `teachers`, `general`)
   - quality gate before build:
     - each `primary_text` is multi-line (at least 4 line breaks)
     - includes concrete detail lines (numbers or specific curriculum/content facts)
     - includes an explicit CTA line
     - audience variants are materially different, not paraphrases
   - if the gate fails, request a rewrite from `ad-copy-writer` before proceeding
5. Execute `mcp__meta_marketing_plugin__run_structured_ad_build`.
6. Return IDs and next steps.

Rules:
- Use Meta MCP tools only.
- Do not invent claims or IDs.
