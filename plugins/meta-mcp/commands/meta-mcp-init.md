Initialize Meta Ads workspace config for this project, including the local MCP env file used by this plugin.

Steps:
1. If `.claude/meta-mcp/mcp-env.local.json` does not exist, create `.claude/meta-mcp/` and create that file from `mcp-env.example.json`.
2. If `.claude/meta-mcp/site-profiles.local.json` does not exist, create it from `site-profiles.example.json`.
3. If `.claude/meta-mcp/BUSINESS_RULES.local.md` does not exist, create it from `BUSINESS_RULES.example.md`.
4. If `.claude/meta-mcp/README.md` does not exist, create a short note that points to:
   - `.claude/meta-mcp/mcp-env.local.json`
   - `.claude/meta-mcp/site-profiles.local.json`
   - `.claude/meta-mcp/BUSINESS_RULES.local.md`
5. If `.claude/.gitignore` does not exist, create it. Ensure it contains `meta-mcp/mcp-env.local.json`.
6. Do not overwrite existing local files unless the user explicitly asks.
7. After initialization, tell the user exactly which fields they still need to fill in.

Rules:
- Use the example files bundled with this plugin as the source of truth for starter structure.
- Keep the generated project-local files editable and project-specific.
- The `meta` MCP server for this plugin reads secrets from `.claude/meta-mcp/mcp-env.local.json`.
- `META_ACCESS_TOKEN` is required in that file.
- `OPENAI_API_KEY` is only required for structured ad-copy generation.
- Never suggest committing `mcp-env.local.json`.
