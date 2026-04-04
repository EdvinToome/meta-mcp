If `.claude/meta-mcp/site-profiles.local.json` is missing, stop and ask the user to run `/meta-mcp-init` first.

Use the workflow in `skills/meta-ads-builder/SKILL.md`.

Start by:
1. Checking the `meta` MCP server with `health_check` and `get_capabilities`.
2. Resolving the site profile from `.claude/meta-mcp/site-profiles.local.json`.
3. Resolving the selected image or working folder.
4. Building a compact resolved brief before write calls.

Prefer the structured build flow so one selected image can become a full Meta ad publish flow with the saved profile defaults.
