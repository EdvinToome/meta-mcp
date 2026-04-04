# Meta Ads MCP Codex Plugin

This plugin installs:
- Codex slash commands for publish, reporting, diagnosis, and copy
- bundled Meta Ads skills and starter docs

Before using the workflows:
1. Run `/meta-mcp-init`.
2. Fill `~/.meta-mcp/meta.env`.
3. Fill `~/.meta-mcp/site-profiles.local.json`.
4. Fill `~/.meta-mcp/BUSINESS_RULES.local.md`.
5. Restart Codex so the plugin bundle can launch the `meta-ads-mcp` MCP server.

The installer only creates missing files under `~/.meta-mcp`; it does not overwrite existing local config.
