# Meta Ads MCP Claude Plugin

This plugin installs:
- the `meta` MCP server via `npx -y @edvintoome/meta-mcp`
- project slash commands for publish, reporting, diagnosis, and copy
- bundled Meta Ads skills and starter docs

Before using the workflows in a project:
1. Run `/meta-mcp-init`.
2. Fill `.claude/meta-mcp/mcp-env.local.json`.
3. Fill `.claude/meta-mcp/site-profiles.local.json`.
4. Fill `.claude/meta-mcp/BUSINESS_RULES.local.md`.
5. Set `OPENAI_API_KEY` in `mcp-env.local.json` only if you want structured ad-copy generation.
