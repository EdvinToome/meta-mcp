Initialize Meta Ads workspace config for this project.

Steps:
1. If `.claude/meta-mcp/site-profiles.local.json` does not exist, create `.claude/meta-mcp/` and create that file from `site-profiles.example.json`.
2. If `.claude/meta-mcp/BUSINESS_RULES.local.md` does not exist, create it from `BUSINESS_RULES.example.md`.
3. If `.claude/meta-mcp/README.md` does not exist, create a short note that points to:
   - `.claude/meta-mcp/site-profiles.local.json`
   - `.claude/meta-mcp/BUSINESS_RULES.local.md`
4. If `.claude/.gitignore` does not exist, create it. Ensure it contains:
   - `meta-mcp/site-profiles.local.json`
   - `meta-mcp/BUSINESS_RULES.local.md`
5. Do not overwrite existing local files unless the user explicitly asks.
6. After initialization, tell the user exactly which fields they still need to fill in.
7. Remind the user that the `meta` MCP server token is global and should be installed with the Meta MCP installer, not stored in this project.

Rules:
- Use the example files bundled with this plugin as the source of truth for starter structure.
- Keep the generated project-local files editable and project-specific.
- The `meta` MCP server for this plugin is configured globally.
- Never suggest committing project-local profile or business rule files.
