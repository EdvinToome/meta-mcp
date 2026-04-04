Initialize the local Meta Ads config for Codex.

Steps:
1. If `~/.meta-mcp/meta.env` does not exist, create it with `META_ACCESS_TOKEN`, and add `META_APP_ID`, `META_APP_SECRET`, and `META_BUSINESS_ID` only if you need them.
2. If `~/.meta-mcp/site-profiles.local.json` does not exist, create `~/.meta-mcp/` and copy the starter file from `site-profiles.example.json`.
3. If `~/.meta-mcp/BUSINESS_RULES.local.md` does not exist, copy the starter file from `BUSINESS_RULES.example.md`.
4. If `~/.meta-mcp/README.md` does not exist, create a short note that points to:
   - `~/.meta-mcp/meta.env`
   - `~/.meta-mcp/site-profiles.local.json`
   - `~/.meta-mcp/BUSINESS_RULES.local.md`
5. Do not overwrite existing local files unless the user explicitly asks.
6. After initialization, tell the user exactly which fields they still need to fill in.
7. Remind the user that the `meta` MCP server token is global and should be installed with the Meta MCP installer, not stored in this plugin bundle.

Rules:
- Use the example files bundled with this plugin as the source of truth for starter structure.
- Keep the generated home-directory files editable and user-specific.
- The `meta` MCP server for this plugin is configured globally.
- Never suggest committing the home-directory profile or business rule files.
