---
name: meta-ads-builder
description: Build Meta campaign + ad set + creative + ad from one resolved brief.
---

Use this for campaign publishing.

Read:
- `~/.meta-marketing-plugin/site-profiles.local.json`
- `~/.meta-marketing-plugin/brand_dna.yaml`

Workflow:
1. Resolve `site_profile` from global profiles.
2. Resolve image, `target_url`, budget, status, CTA.
3. Delegate copy generation to subagent `ad_copy_writer` with:
   - `target_url`
   - `creative_description`
   - `site_profile`
4. Require structured return:
   - `copy_context`
   - `copy_variants` (`parents`, `teachers`, `general`)
5. Execute `mcp__meta_marketing_plugin__run_structured_ad_build`.
6. Return created IDs and next operator actions.

Rules:
- Use Meta MCP tools only.
- Do not invent profile IDs or claims.
- Stop on missing required inputs.
