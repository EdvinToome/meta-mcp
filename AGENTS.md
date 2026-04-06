# AGENTS.md

## Repo Purpose

This repo ships a Meta Marketing MCP server plus host-specific agent scaffolding for Codex and Claude.

## Local Runtime Files

Use these files as runtime truth:
- `~/.meta-marketing-plugin/site-profiles.local.json`
- `~/.meta-marketing-plugin/brand_dna.yaml`
- `.claude/meta-marketing-plugin/site-profiles.local.json` (Claude project scope)

Do not commit live business data.

## Publishing Rules

- Keep tracked docs generic.
- Keep setup outputs local.
- Do not add business IDs/domains/tokens to tracked files.

## Working Style

- Use Meta MCP tools for Meta API operations.
- Resolve `site_profile` before raw IDs.
- Use global `brand_dna.yaml` for business context.
