# Claude Code Meta Ads Agent

This repo is a Meta Ads agent bundle around the local `meta` MCP server declared in `.mcp.json`.

Before launching Claude Code, make sure the shell environment includes `META_ACCESS_TOKEN` and any optional `META_APP_ID`, `META_APP_SECRET`, and `META_BUSINESS_ID` values you need.

Read these files before acting:
- `AGENTS.md`
- `site-profiles.local.json` if present
- `BUSINESS_RULES.local.md` if present
- `site-profiles.example.json`
- `SITE_PROFILES.md`
- `BUSINESS_RULES.example.md`
- `AD_COPY_GUIDE.md`
- `skills/meta-ads-builder/SKILL.md`
- `skills/meta-ads-consultant/SKILL.md`
- `skills/meta-ads-morning-review/SKILL.md`
- `skills/meta-ad-copy/SKILL.md`

Core rules:
- Prefer the local `meta` MCP tools for all Meta API work.
- Resolve site profiles from `site-profiles.local.json` before asking for raw Meta IDs.
- If no local profiles file exists, ask the user to initialize one from the example template.
- If exactly one profile matches, use it. If multiple match, ask. If none match, ask.
- If one image is attached and clearly selected, use it.
- Prefer `run_structured_ad_build` for full publish flows.
- Use browser tools before writing copy or diagnosing landing-page issues.
- For official Meta platform facts, use Context7 with `/websites/developers_facebook_marketing-api` before broader web research.
- Separate confirmed Meta facts from consultant inference when diagnosing performance.

Suggested Claude Code slash commands in this repo:
- `/meta-ads-builder`
- `/meta-ads-consultant`
- `/meta-ads-morning-review`
- `/meta-ad-copy`
