---
name: meta-ads-builder
description: Guided end-to-end Meta Ads publish flow for this repo's Meta MCP server, including site-profile resolution, local image intake, structured build, and final persistence.
---

# Meta Ads Builder

Use this skill to turn a selected image into a published or paused Meta ad using this repo's local Meta MCP server.

Read before acting:
- `site-profiles.local.json` in the current workspace if it exists
- `site-profiles.example.json`
- `SITE_PROFILES.md`
- `~/.meta-marketing-plugin/brand_dna.yaml`
- [`references/server-modes.md`](./references/server-modes.md)
- [`references/brief-schema.md`](./references/brief-schema.md)

## Quick Start

1. Confirm the server is reachable with `mcp__meta_ads_mcp__health_check` and inspect runtime coverage with `mcp__meta_ads_mcp__get_capabilities`.
2. Resolve the site profile from `site-profiles.local.json` in the current workspace by slug, label, domain, or destination URL.
3. Resolve the selected image or attached creative.
4. Resolve destination URL, budget, CTA, status, and optional scheduled start.
5. Call `/ad-copy-writer` to generate `copy_context` and `copy_variants` from `target_url`.
6. Verify the returned copy payload is builder-ready.
7. Prefer `mcp__meta_ads_mcp__run_structured_ad_build` for the full website-sales flow.
8. Save `meta-ads-brief.json` and `meta-ads-result.json` in the working folder.

## Workflow

### 1. Preflight

- Start by checking `mcp__meta_ads_mcp__health_check` and `mcp__meta_ads_mcp__get_capabilities`.
- Treat the live Meta tool registry and `tools_available` output as the source of truth.
- Resolve the site profile before asking for raw Meta IDs.
- If no local profiles file exists, ask the user to initialize one in the current workspace from the example template.
- If exactly one profile matches, use it.
- If multiple profiles match, ask one compact disambiguation question.
- If no profile matches, ask for the profile to use before creating anything.

### 2. Resolve The Creative Input

- If the user attached one image and clearly refers to it, use it.
- If more than one image is attached, ask which one to use.
- If no attachment exists, ask for one image path or one working folder.
- If a folder is used, run `python3 scripts/list_image_candidates.py <folder> --json` from this skill directory.
- Treat the selected image and working folder as the source of truth for persisted brief and result files.

### 3. Resolve Remaining Inputs

Resolve only what is still missing after the profile and image are known.

Profile-derived defaults:
- `account_id`
- `page_id`
- `instagram_user_id`
- `pixel_id`
- `countries`
- `default_url`
- localization fields such as `brand_name`, `language`, `country`, and `domain`

Ask for:
- `destination_url`, defaulting to the profile `default_url`
- budget
- CTA if the user wants something other than the default
- `status`, default `PAUSED`
- `start_time` only when the user wants scheduling
- product or article name if it is not obvious from the destination

Scheduling rule:
- If the user explicitly asks for a scheduled start and does not give a time, default `start_time` to the next day at `08:00` in the profile's local market.

### 4. Build Copy

- Delegate copy generation to `/ad-copy-writer`.
- Pass `target_url`, profile localization fields, and optional creative description.
- Require structured return payload:
  - `copy_context` with `brand_name`, `language`, `country`, `product_name`, `page_type`, `product_facts`, `creative_description`
  - `copy_variants` with `parents`, `teachers`, `general`, each containing `headline` and `primary_text`
- If copy payload is missing or malformed, stop and request regeneration.

### 5. Confirm A Resolved Brief

Before any write call, show a compact resolved brief with:
- chosen site profile
- selected image
- destination URL
- budget and status
- copy context assumptions
- copy variants
- object naming

Persist the same structure to `meta-ads-brief.json` in the working folder.

### 6. Execute

Preferred path:
1. Upload the selected image with `mcp__meta_ads_mcp__upload_creative_asset` or use `mcp__meta_ads_mcp__upload_image_from_url`.
2. Run `mcp__meta_ads_mcp__run_structured_ad_build` with both `copy_context` and `copy_variants`.

Fallback path:
1. Upload asset
2. `mcp__meta_ads_mcp__create_campaign`
3. `mcp__meta_ads_mcp__create_ad_set_enhanced`
4. `mcp__meta_ads_mcp__create_ad_creative`
5. `mcp__meta_ads_mcp__create_ad`

Structured-build defaults for website-sales flows:
- use the selected profile for `account_id`, `page_id`, `instagram_user_id`, `pixel_id`, and `countries`
- use a dynamic-creative build when the MCP supports it
- pass explicit `Parents`, `Teachers`, and `General` copy variants from the agent layer

### 7. Persist Results

Write `meta-ads-result.json` in the working folder with:
- chosen profile slug
- selected assets
- created object IDs
- preview URLs if returned
- skipped steps and why

## Rules

- Prefer saved site profiles over manually typed Meta IDs.
- Never invent `account_id`, `page_id`, `instagram_user_id`, `pixel_id`, `countries`, or `domain`.
- Never invent product facts in copy payloads.
- A paused request still means full build: campaign, ad set, creative, and ad.
- If the campaign already owns the budget, do not also set an ad set budget.
- If the server cannot upload a local image, require a hosted image URL or stop clearly.
- If the server cannot create a final ad object, say that clearly and stop after creative creation.
- Do not use shell commands for Meta API operations.
- Do not inspect attachment files with `exec`.
