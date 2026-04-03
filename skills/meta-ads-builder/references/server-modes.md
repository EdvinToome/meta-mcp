# Meta Ads MCP Server Modes

Use this reference when the available Meta tools do not obviously support the full image-to-ad flow.

## Why this matters

Different Meta Ads MCP servers expose different write paths.
Do not assume that every server can upload local images or create final ad objects.
Inspect runtime capabilities first, then branch.
Treat the live tool registry as more trustworthy than helper text when they disagree.

## Mode A: This repo's local full-flow server

This is the default target for the repo-local Codex setup.
Typical characteristics:
- can create campaigns
- can create ad sets
- can upload local image assets
- can create creatives from uploaded assets
- can create final ad objects

Observed tool coverage in this repo includes:
- `create_campaign`
- `create_ad_set_enhanced`
- `upload_creative_asset`
- `upload_image_from_url`
- `create_ad_creative`
- `preview_ad`
- `create_ad`
- `get_ad_accounts`
- `list_campaigns`
- `list_ad_sets`
- `list_campaign_ad_sets`
- `list_creatives`

Implications:
- use this mode by default for the local server unless a fresh runtime check says otherwise
- prefer `create_ad_set_enhanced` over `create_ad_set`
- prefer `upload_creative_asset` for local files and `upload_image_from_url` for hosted files
- treat `create_ad` as part of the normal happy path
- if the campaign already has a budget, omit ad set budget fields on `create_ad_set_enhanced`
- a full tool surface does not guarantee page or Instagram profile permissions

## Mode B: Creative-only server

This is the fallback path for older or narrower Meta MCP surfaces.
Observed characteristics:
- campaign and ad set creation exist
- creative creation exists
- local image upload is missing
- final `create_ad` is missing
- creative creation expects hosted media inputs such as `image_url`

Implications:
- a local folder is still useful for asset discovery and state storage
- the user must provide hosted image URLs unless another upload mechanism is discovered at runtime
- final ad creation must be skipped if the server does not actually expose an ad creation tool

## Legacy or mismatched helper metadata

Do not assume older notes, README examples, or stale `get_capabilities` text are accurate for the current live server.
If helper text says one thing and the actual live tool menu says another, trust the live tool menu.

## Branching rule

1. Call `mcp__meta__health_check`.
2. Call `mcp__meta__get_capabilities`.
3. Check the live exposed tools and confirm whether the server can do all of the following:
   - create campaign
   - create ad set
   - create creative
   - upload or otherwise ingest a local image from disk
   - create ad
4. If yes, run the complete flow.
5. If `create_ad_set_enhanced` exists, prefer it over `create_ad_set`.
6. If image upload is missing, require hosted image URLs or stop after asset selection.
7. If ad creation is missing, complete campaign, ad set, and creative creation, then report the exact unsupported step.
8. If creative creation fails with page or profile permission errors, stop and report that the account token can upload assets and create campaign objects, but cannot currently publish new page-backed creatives for that profile setup.

## Non-negotiable behavior

- Never promise a full launch until capability detection confirms it.
- Never fake page IDs, asset hashes, or unsupported tool calls.
- Never default to creative-only mode on the repo-local setup unless runtime checks prove it.
- Always tell the user which server mode you are using before write operations start.
