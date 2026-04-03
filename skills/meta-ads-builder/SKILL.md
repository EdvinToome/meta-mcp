---
name: meta-ads-builder
description: Guided end-to-end Meta Ads publish flow for this repo's Meta MCP server, including site-profile resolution, local image intake, structured build, and final persistence.
---

# Meta Ads Builder

Use this skill to turn a selected image into a published or paused Meta ad using this repo's local `meta` MCP server.

Read before acting:
- `../../site-profiles.local.json` if it exists
- [`../../site-profiles.example.json`](../../site-profiles.example.json)
- [`../../SITE_PROFILES.md`](../../SITE_PROFILES.md)
- `../../BUSINESS_RULES.local.md` if it exists
- [`../../BUSINESS_RULES.example.md`](../../BUSINESS_RULES.example.md)
- [`../../AD_COPY_GUIDE.md`](../../AD_COPY_GUIDE.md)
- [`../meta-ad-copy/SKILL.md`](../meta-ad-copy/SKILL.md)
- [`references/server-modes.md`](./references/server-modes.md)
- [`references/brief-schema.md`](./references/brief-schema.md)

## Quick Start

1. Confirm the server is reachable with `mcp__meta__health_check` and inspect runtime coverage with `mcp__meta__get_capabilities`.
2. Resolve the site profile from `site-profiles.local.json` by slug, label, domain, or destination URL.
3. Resolve the selected image or attached creative.
4. Resolve destination URL, budget, CTA, status, and optional scheduled start.
5. If copy is needed and a target URL exists, open that URL with browser tools and extract compact verified `copy_context`.
6. Prefer `mcp__meta__run_structured_ad_build` for the full website-sales flow.
7. Save `meta-ads-brief.json` and `meta-ads-result.json` in the working folder.

## Workflow

### 1. Preflight

- Start by checking `mcp__meta__health_check` and `mcp__meta__get_capabilities`.
- Treat the live Meta tool registry and `tools_available` output as the source of truth.
- Resolve the site profile before asking for raw Meta IDs.
- If no local profiles file exists, ask the user to initialize one from the example template.
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

### 4. Build Copy Context

- If the selected target URL exists, open it with browser tools before writing copy.
- Determine whether the page is a `product` page or `advertorial`.
- Extract only verified facts relevant for copy.
- Pass `copy_context`, not finished headlines or primary texts, when the structured build is available.
- `copy_context` must contain `brand_name`, `language`, `country`, `product_name`, page type, verified `product_facts`, and a short `creative_description`.

### 5. Confirm A Resolved Brief

Before any write call, show a compact resolved brief with:
- chosen site profile
- selected image
- destination URL
- budget and status
- copy context assumptions
- object naming

Persist the same structure to `meta-ads-brief.json` in the working folder.

### 6. Execute

Preferred path:
1. Upload the selected image with `mcp__meta__upload_creative_asset` or use `mcp__meta__upload_image_from_url`.
2. Run `mcp__meta__run_structured_ad_build`.

Fallback path:
1. Upload asset
2. `mcp__meta__create_campaign`
3. `mcp__meta__create_ad_set_enhanced`
4. `mcp__meta__create_ad_creative`
5. `mcp__meta__create_ad`

Structured-build defaults for website-sales flows:
- use the selected profile for `account_id`, `page_id`, `instagram_user_id`, `pixel_id`, and `countries`
- use a dynamic-creative build when the MCP supports it
- let the build generate `Parents`, `Teachers`, and `General` copy from the compact `copy_context`

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
- A paused request still means full build: campaign, ad set, creative, and ad.
- If the campaign already owns the budget, do not also set an ad set budget.
- If the server cannot upload a local image, require a hosted image URL or stop clearly.
- If the server cannot create a final ad object, say that clearly and stop after creative creation.
- Do not use shell commands for Meta API operations.
- Do not inspect attachment files with `exec`.
