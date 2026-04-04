#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
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

function getClaudeConfigPath() {
  switch (process.platform) {
    case "darwin":
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json"
      );
    case "win32":
      return path.join(
        os.homedir(),
        "AppData",
        "Roaming",
        "Claude",
        "claude_desktop_config.json"
      );
    case "linux":
      return path.join(
        os.homedir(),
        ".config",
        "Claude",
        "claude_desktop_config.json"
      );
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

const projectRoot = path.resolve(readArg("--project") || process.cwd());
const claudeMetaRoot = path.join(projectRoot, ".claude", "meta-mcp");
const commandsRoot = path.join(projectRoot, ".claude", "commands");
const claudePath = path.join(projectRoot, "CLAUDE.md");
const claudeConfigPath = getClaudeConfigPath();

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

function writeGlobalClaudeConfig(metaAccessToken) {
  const payload = fs.existsSync(claudeConfigPath)
    ? JSON.parse(fs.readFileSync(claudeConfigPath, "utf8"))
    : {};
  const existingServer = payload.mcpServers?.meta || {};
  const existingEnv = existingServer.env || {};

  payload.mcpServers ||= {};
  payload.mcpServers.meta = {
    command: "npx",
    args: ["-y", "@edvintoome/meta-mcp"],
    env: {
      ...existingEnv,
      META_ACCESS_TOKEN: metaAccessToken,
    },
  };

  ensureDirectory(path.dirname(claudeConfigPath));
  fs.writeFileSync(claudeConfigPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeClaudeReadme() {
  const readmePath = path.join(claudeMetaRoot, "README.md");
  const content = `# Meta MCP for Claude Code

This project uses the globally configured \`meta\` MCP server.

Before acting on Meta Ads work, read:
- \`.claude/meta-mcp/site-profiles.local.json\`
- \`.claude/meta-mcp/BUSINESS_RULES.local.md\`
- \`.claude/meta-mcp/site-profiles.example.json\`
- \`.claude/meta-mcp/SITE_PROFILES.md\`
- \`.claude/meta-mcp/BUSINESS_RULES.example.md\`
- \`.claude/meta-mcp/AD_COPY_GUIDE.md\`
- \`.claude/meta-mcp/MCP_USAGE.md\`
- \`.claude/meta-mcp/skills/meta-ads-builder/SKILL.md\`
- \`.claude/meta-mcp/skills/meta-ads-consultant/SKILL.md\`
- \`.claude/meta-mcp/skills/meta-ads-morning-review/SKILL.md\`
- \`.claude/meta-mcp/skills/meta-ad-copy/SKILL.md\`

Core rules:
- Use the global \`meta\` MCP server for Meta API actions.
- Resolve site profiles before asking for raw Meta IDs.
- Prepare ad copy in the agent layer before the structured build call.
- Use browser tools before diagnosing landing-page or creative issues.
`;

  fs.writeFileSync(readmePath, content);
}

function ensureGitignoreEntries() {
  const gitignorePath = path.join(projectRoot, ".claude", ".gitignore");
  const entries = [
    "meta-mcp/site-profiles.local.json",
    "meta-mcp/BUSINESS_RULES.local.md",
  ];

  ensureDirectory(path.dirname(gitignorePath));
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, "");
  }

  const existing = fs.readFileSync(gitignorePath, "utf8").split("\n");
  const missing = entries.filter((entry) => !existing.includes(entry));

  if (missing.length === 0) {
    return;
  }

  const next = `${existing.join("\n").trimEnd()}\n${missing.join("\n")}\n`;
  fs.writeFileSync(gitignorePath, next.replace(/^\n/, ""));
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
  ensureLink(
    path.join(repoRoot, "plugins", "meta-mcp", "MCP_USAGE.md"),
    path.join(claudeMetaRoot, "MCP_USAGE.md")
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
    "Start by checking the global `meta` MCP server with `health_check` and `get_capabilities`.",
    "Resolve the site profile from `.claude/meta-mcp/site-profiles.local.json` before using raw Meta IDs.",
    "Prepare `copy_context` and `copy_variants` before the structured build call."
  ]);
  writeCommand("meta-ads-consultant", ".claude/meta-mcp/skills/meta-ads-consultant/SKILL.md", [
    "Start with live campaign data from the global `meta` MCP server.",
    "Separate confirmed Meta facts from your consultant inference.",
    "Use browser tools before commenting on landing pages or creative."
  ]);
  writeCommand("meta-ads-morning-review", ".claude/meta-mcp/skills/meta-ads-morning-review/SKILL.md", [
    "Start with yesterday's performance for the active site profiles.",
    "Anchor conclusions in trailing 7-day context and return clear actions."
  ]);
  writeCommand("meta-ad-copy", ".claude/meta-mcp/skills/meta-ad-copy/SKILL.md", [
    "Resolve the site profile before drafting copy.",
    "Return explicit `copy_variants` when the publish flow needs structured build input."
  ]);
}

function getPrompt(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let metaAccessToken = process.env.META_ACCESS_TOKEN || readArg("--meta-token");

  if (!metaAccessToken) {
    metaAccessToken = (await getPrompt(rl, "Meta Access Token: ")).trim();
  }

  rl.close();

  if (!metaAccessToken) {
    throw new Error("META_ACCESS_TOKEN is required");
  }

  installClaudeBundle();
  writeManagedClaudeFile();
  writeGlobalClaudeConfig(metaAccessToken);
  ensureGitignoreEntries();

  console.log("✅ Installed Meta MCP support for Claude Code");
  console.log(`Project: ${projectRoot}`);
  console.log(`Claude bundle: ${claudeMetaRoot}`);
  console.log(`Commands: ${commandsRoot}`);
  console.log(`Claude MCP config: ${claudeConfigPath}`);
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
