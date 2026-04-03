#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createLocalFileIfMissing, ensureDirectory } from "./workspace-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const force = args.includes("--force");

function readArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

const projectRoot = path.resolve(readArg("--project") || process.cwd());
const claudeMetaRoot = path.join(projectRoot, ".claude", "meta-mcp");
const commandsRoot = path.join(projectRoot, ".claude", "commands");
const claudePath = path.join(projectRoot, "CLAUDE.md");
const mcpPath = path.join(projectRoot, ".mcp.json");

function removePath(targetPath) {
  const stat = fs.lstatSync(targetPath);
  if (stat.isSymbolicLink() || stat.isFile()) {
    fs.unlinkSync(targetPath);
    return;
  }
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function ensureLink(source, target) {
  const type = fs.lstatSync(source).isDirectory() ? "dir" : "file";
  ensureDirectory(path.dirname(target));

  if (!fs.existsSync(target)) {
    fs.symlinkSync(source, target, type);
    return;
  }

  if (fs.lstatSync(target).isSymbolicLink()) {
    const currentTarget = fs.realpathSync(target);
    if (currentTarget === fs.realpathSync(source)) {
      return;
    }
  }

  if (!force) {
    throw new Error(`${target} already exists. Re-run with --force to replace it.`);
  }

  removePath(target);
  fs.symlinkSync(source, target, type);
}

function writeFile(targetPath, content) {
  if (fs.existsSync(targetPath) && !force) {
    throw new Error(`${targetPath} already exists. Re-run with --force to replace it.`);
  }
  ensureDirectory(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content);
}

function writeManagedClaudeFile() {
  const start = "<!-- meta-mcp:start -->";
  const end = "<!-- meta-mcp:end -->";
  const block = [
    start,
    "When you use Meta Ads workflows in this project, read `.claude/meta-mcp/README.md` first.",
    "Available slash commands:",
    "- `/meta-ads-builder`",
    "- `/meta-ads-consultant`",
    "- `/meta-ads-morning-review`",
    "- `/meta-ad-copy`",
    end,
    "",
  ].join("\n");

  if (!fs.existsSync(claudePath)) {
    writeFile(claudePath, `# Claude Code\n\n${block}`);
    return;
  }

  const source = fs.readFileSync(claudePath, "utf8");
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}\\n?`, "m");
  const output = pattern.test(source)
    ? source.replace(pattern, block)
    : `${source.trimEnd()}\n\n${block}`;
  fs.writeFileSync(claudePath, output);
}

function writeMcpConfig() {
  const payload = fs.existsSync(mcpPath)
    ? JSON.parse(fs.readFileSync(mcpPath, "utf8"))
    : {};

  payload.mcpServers ||= {};
  payload.mcpServers.meta = {
    command: "node",
    args: [path.join(repoRoot, "build", "index.js")],
  };

  fs.writeFileSync(mcpPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeClaudeReadme() {
  const readmePath = path.join(claudeMetaRoot, "README.md");
  const content = `# Meta MCP for Claude Code

This project uses the Meta Ads MCP server from ${repoRoot}.

Before acting on Meta Ads work, read:
- \`.claude/meta-mcp/site-profiles.local.json\`
- \`.claude/meta-mcp/BUSINESS_RULES.local.md\`
- \`.claude/meta-mcp/site-profiles.example.json\`
- \`.claude/meta-mcp/SITE_PROFILES.md\`
- \`.claude/meta-mcp/BUSINESS_RULES.example.md\`
- \`.claude/meta-mcp/AD_COPY_GUIDE.md\`
- \`.claude/meta-mcp/skills/meta-ads-builder/SKILL.md\`
- \`.claude/meta-mcp/skills/meta-ads-consultant/SKILL.md\`
- \`.claude/meta-mcp/skills/meta-ads-morning-review/SKILL.md\`
- \`.claude/meta-mcp/skills/meta-ad-copy/SKILL.md\`

Core rules:
- Use the local \`meta\` MCP server for Meta API actions.
- Resolve site profiles before asking for raw Meta IDs.
- Prefer \`run_structured_ad_build\` for full publish flows.
- Use browser tools before diagnosing landing-page or creative issues.
`;

  fs.writeFileSync(readmePath, content);
}

function writeCommand(name, skillPath, openingLines) {
  const commandPath = path.join(commandsRoot, `${name}.md`);
  const content = `${openingLines.join("\n")}\n\nUse the workflow in \`${skillPath}\`.\n`;
  fs.writeFileSync(commandPath, content);
}

function installClaudeBundle() {
  ensureDirectory(claudeMetaRoot);
  ensureLink(path.join(repoRoot, "skills"), path.join(claudeMetaRoot, "skills"));
  ensureLink(
    path.join(repoRoot, "site-profiles.example.json"),
    path.join(claudeMetaRoot, "site-profiles.example.json")
  );
  ensureLink(
    path.join(repoRoot, "SITE_PROFILES.md"),
    path.join(claudeMetaRoot, "SITE_PROFILES.md")
  );
  ensureLink(
    path.join(repoRoot, "BUSINESS_RULES.example.md"),
    path.join(claudeMetaRoot, "BUSINESS_RULES.example.md")
  );
  ensureLink(
    path.join(repoRoot, "AD_COPY_GUIDE.md"),
    path.join(claudeMetaRoot, "AD_COPY_GUIDE.md")
  );
  createLocalFileIfMissing(
    path.join(repoRoot, "site-profiles.example.json"),
    path.join(claudeMetaRoot, "site-profiles.local.json")
  );
  createLocalFileIfMissing(
    path.join(repoRoot, "BUSINESS_RULES.example.md"),
    path.join(claudeMetaRoot, "BUSINESS_RULES.local.md")
  );
  writeClaudeReadme();
  ensureDirectory(commandsRoot);
  writeCommand("meta-ads-builder", ".claude/meta-mcp/skills/meta-ads-builder/SKILL.md", [
    "Start by checking the local `meta` MCP server with `health_check` and `get_capabilities`.",
    "Resolve the site profile from `.claude/meta-mcp/site-profiles.local.json` before using raw Meta IDs.",
    "Resolve the selected image or working folder, then prefer the structured build flow."
  ]);
  writeCommand("meta-ads-consultant", ".claude/meta-mcp/skills/meta-ads-consultant/SKILL.md", [
    "Start with live campaign data from the local `meta` MCP server.",
    "Separate confirmed Meta facts from your consultant inference.",
    "Use browser tools before commenting on landing pages or creative."
  ]);
  writeCommand("meta-ads-morning-review", ".claude/meta-mcp/skills/meta-ads-morning-review/SKILL.md", [
    "Start with yesterday's performance for the active site profiles.",
    "Anchor conclusions in trailing 7-day context and return clear actions."
  ]);
  writeCommand("meta-ad-copy", ".claude/meta-mcp/skills/meta-ad-copy/SKILL.md", [
    "Resolve the site profile before drafting copy.",
    "Keep copy operational, short, and parent-friendly for this business."
  ]);
}

function main() {
  installClaudeBundle();
  writeManagedClaudeFile();
  writeMcpConfig();

  console.log("✅ Installed Meta MCP support for Claude Code");
  console.log(`Project: ${projectRoot}`);
  console.log(`Claude bundle: ${claudeMetaRoot}`);
  console.log(`Commands: ${commandsRoot}`);
  console.log(`MCP config: ${mcpPath}`);
}

main();
