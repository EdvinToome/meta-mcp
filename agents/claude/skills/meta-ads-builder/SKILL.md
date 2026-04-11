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
   - If `image_path` or `image_hash` is provided, continue directly to publish.
   - Do not call publish flow before explicit candidate approval.
3. Build campaign, ad set and ad names with this required format:
   - `Brand | Country | Date | Description`
   - Date format: `YYYY-MM-DD`
   - Description is free-form and concise 2-4 words.
   - Use different description focus by level.
   - use one shared `campaign_name` for the whole request
   - choose `ad_set_name`, `creative_name`, and `ad_name` according to the proposed structure
4. For each creative, delegate copy generation to subagent `ad-copy-writer` separately (one subagent call per creative):
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
   - if the gate fails for a creative, request a rewrite from `ad-copy-writer` for that creative before proceeding
   - keep strict one-to-one mapping: creative N -> copy output N -> build item N
5. After copy generation and image resolution, propose the campaign structure before publishing.
   - Always show a concrete structure proposal and stop for user approval.
   - Present:
     - one shared campaign
     - how many ad sets
     - which creatives go into each ad set
     - whether each creative becomes one ad in its own ad set or multiple ads share one ad set
   - Ask the user to confirm or change the structure.
   - Do not call `run_structured_ad_build` until the user approves the structure.
6. Build `run_structured_ad_build.builds` with one build item per creative:
   - pass `builds` as a real JSON array, not a stringified JSON value
   - each item must include that creative's own `image_path`/`image_hash`, `target_url`, and `copy_variants`
   - keep the same `campaign_name` across every item
   - use `ad_set_key` to group multiple ads into one ad set
   - omit `ad_set_key` when a creative should get its own ad set
   - keep strict one-to-one mapping: creative N -> `copy_variants` N -> build item N
7. Execute `mcp__meta_marketing_plugin__run_structured_ad_build` only after image is resolved and the user approves the structure. Pass:
   - `language` from `site_profile.language`
   - `country` from `site_profile.country`
   - `status=PAUSED` unless the user explicitly asks for immediate activation
8. Return created IDs, links to ads, and for each audience variant include:
   - original `headline` and `primary_text`
   - English translation of `headline` and `primary_text`
   - next operator actions


Rules:
- Use Meta MCP tools only.
- Do not invent claims or IDs.
- `run_structured_ad_build` now creates normal ad sets, not classic dynamic-creative ad sets.
- Multiple ads can share one ad set when they use the same `ad_set_key`.
- Meta API does not expose a real draft status here. Use `PAUSED` as the default review state unless the user explicitly wants `ACTIVE`.
