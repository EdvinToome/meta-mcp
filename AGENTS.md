# AGENTS.md

## Repo Purpose

This workspace packages a Meta Ads MCP server plus Codex and Claude Code agent scaffolding.

The public repo should stay generic.

Do not commit business-specific operating data into tracked files.

## Local Overrides

If present, read these local override files before acting on brand-specific work:
- `site-profiles.local.json`
- `AGENTS.local.md`
- `.claude/meta-marketing-plugin/site-profiles.local.json`
- `~/.meta-marketing-plugin/site-profiles.local.json`
- `~/.meta-marketing-plugin/brand_dna.yaml`

If the local override files do not exist, use these tracked templates as references only:
- `templates/site-profiles.example.json`
- `templates/brand_dna.example.yaml`
- `templates/SITE_PROFILES.md`

## Publishing Rules

- Keep README examples generic.
- Keep starter prompts generic.
- Keep tracked templates free of live account IDs, pixels, pages, domains, or private strategy notes.
- Put real business configuration in local override files only.

## Working Style

- Prefer the local `meta` MCP server for Meta API operations.
- Resolve site profiles from the local override file first.
- Use `~/.meta-marketing-plugin/brand_dna.yaml` as the single source for business context.
- Treat example files as schema and setup references, not as live runtime state.
- If the user asks to add or update a real profile, write it to the local override file, not the tracked example.
