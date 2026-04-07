# Meta Marketing Plugin

Meta Marketing API MCP server with separate Codex and Claude agent scaffolding.

## Layout

```text
meta-mcp/src/          # MCP server implementation
meta-mcp/api/          # API handlers
meta-mcp/scripts/      # runtime/setup scripts
meta-mcp/mcp/codex/    # Codex MCP runtime files
meta-mcp/mcp/claude/   # Claude MCP runtime files
agents/codex/          # Codex-only skills and subagent templates
agents/claude/         # Claude-only skills, commands, and subagent templates
templates/             # shared non-example docs
scripts/               # install/setup scripts
```

## Install

### Codex

```bash
curl -fsSL https://raw.githubusercontent.com/EdvinToome/meta-mcp/main/scripts/install-codex-plugin.sh | bash
```

Creates/updates:
- `~/.codex/plugins/meta-marketing-plugin`
- `~/.codex/agents/ad-copy-writer.toml`
- `~/.meta-marketing-plugin/site-profiles.local.json`
- `~/.meta-marketing-plugin/brand_dna_copy.yaml`
- `~/.meta-marketing-plugin/brand_dna_visual.yaml`
- `~/.meta-marketing-plugin/meta.env`

### Claude Code Desktop

```bash
curl -fsSL https://raw.githubusercontent.com/EdvinToome/meta-mcp/main/scripts/install-claude-desktop.sh | bash -s -- --project /absolute/path/to/project --meta-token 'YOUR_META_TOKEN'
```

Creates/updates:
- `.claude/meta-marketing-plugin/.mcp.json`
- `.claude/meta-marketing-plugin/scripts/launch-meta-server.js`
- `.claude/meta-marketing-plugin/site-profiles.local.json`
- `.claude/meta-marketing-plugin/brand_dna_copy.yaml`
- `.claude/meta-marketing-plugin/brand_dna_visual.yaml`
- `.claude/agents/ad-copy-writer.md`
- `.claude/commands/meta-ads-builder.md`
- `.claude/commands/meta-ads-morning-review.md`

## Claude Commands

- `/meta-ads-builder`
- `/meta-ads-morning-review`

## Development

```bash
npm install
npm run build
npm run setup:codex-plugin
npm run setup:claude -- --project /absolute/path/to/project
```
