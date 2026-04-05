# Meta Marketing Plugin

Meta Marketing API MCP server plus a cleaned agent/plugin layout for Codex and Claude Code.

## Structure

```text
src/                  # MCP server implementation
agent/                # canonical skills + command prompts
templates/            # canonical config templates
hosts/codex/          # Codex host manifest + launcher
scripts/              # installers and setup scripts
.codex-plugin/        # repo-level Codex plugin manifest
.claude-plugin/       # Claude marketplace manifest
```

The canonical sources are `agent/` and `templates/`. Host bundles are assembled from these sources.

## Names

- Plugin name: `meta-marketing-plugin`
- Claude marketplace name: `meta-marketing-plugin-marketplace`
- Codex local config: `~/.meta-marketing-plugin`
- Claude project config: `.claude/meta-marketing-plugin`

## Quick Setup

### Codex

```bash
curl -fsSL https://raw.githubusercontent.com/EdvinToome/meta-mcp/main/scripts/install-codex-plugin.sh | bash
```

This installs a local Codex plugin bundle at:
- `~/.codex/plugins/meta-marketing-plugin`

And creates missing local config files at:
- `~/.meta-marketing-plugin/meta.env`
- `~/.meta-marketing-plugin/site-profiles.local.json`
- `~/.meta-marketing-plugin/brand_dna.yaml`
- `~/.codex/agents/ad-copy-writer.toml`

### Claude Code Desktop

```bash
curl -fsSL https://raw.githubusercontent.com/EdvinToome/meta-mcp/main/scripts/install-claude-desktop.sh | bash -s -- --project /absolute/path/to/project --meta-token 'YOUR_META_TOKEN'
```

This installs/updates the marketplace plugin, configures global Claude MCP `meta`, and creates project files:
- `.claude/meta-marketing-plugin/site-profiles.local.json`
- `.claude/agents/ad-copy-writer.md`
- `~/.meta-marketing-plugin/brand_dna.yaml`

## Commands

Final command surface:
- `/meta-ads-builder`
- `/meta-ads-consultant`
- `/meta-ads-morning-review`
- `/ad-copy-writer`

## Local Development

Install dependencies and build:

```bash
npm install
npm run build
```

Optional setup commands:

```bash
npm run setup:codex-plugin
npm run setup:claude -- --project /absolute/path/to/project
```

## Templates

Use canonical templates under `templates/`:
- `templates/site-profiles.example.json`
- `templates/brand_dna.example.yaml`
- `templates/SITE_PROFILES.md`

Do not commit real business data into tracked template files.
