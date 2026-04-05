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

const templatesDir = path.join(repoRoot, "templates");
const skillsDir = path.join(repoRoot, "agent", "skills");
const commandsSourceDir = path.join(repoRoot, "agent", "commands");

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
const claudeMetaRoot = path.join(projectRoot, ".claude", "meta-marketing-plugin");
const commandsRoot = path.join(projectRoot, ".claude", "commands");
const agentsRoot = path.join(projectRoot, ".claude", "agents");
const claudePath = path.join(projectRoot, "CLAUDE.md");
const claudeConfigPath = getClaudeConfigPath();
const globalMetaRoot = path.join(os.homedir(), ".meta-marketing-plugin");
const globalBrandDnaPath = path.join(globalMetaRoot, "brand_dna.yaml");

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }
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

function upsertManagedBlock(filePath, blockStart, blockEnd, lines) {
  const block = [blockStart, ...lines, blockEnd, ""].join("\n");

  if (!fs.existsSync(filePath)) {
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, `# Claude Code\n\n${block}`);
    return;
  }

  const source = fs.readFileSync(filePath, "utf8");
  const pattern = new RegExp(`${blockStart}[\\s\\S]*?${blockEnd}\\n?`, "m");
  const output = pattern.test(source)
    ? source.replace(pattern, block)
    : `${source.trimEnd()}\n\n${block}`;
  fs.writeFileSync(filePath, output);
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

function writeProjectReadme() {
  const readmePath = path.join(claudeMetaRoot, "README.md");
  const content = `# Meta Marketing Plugin (Claude)

This project uses the globally configured \`meta\` MCP server.

Local files:
- \`.claude/meta-marketing-plugin/site-profiles.local.json\`
- \`~/.meta-marketing-plugin/brand_dna.yaml\`

Command surface:
- \`/meta-ads-builder\`
- \`/meta-ads-consultant\`
- \`/meta-ads-morning-review\`
- \`/ad-copy-writer\`
`;
  fs.writeFileSync(readmePath, content);
}

function ensureGitignoreEntries() {
  const gitignorePath = path.join(projectRoot, ".claude", ".gitignore");
  const entries = ["meta-marketing-plugin/site-profiles.local.json"];

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

function installSlashCommands() {
  ensureDirectory(commandsRoot);
  const allowed = new Set([
    "meta-ads-builder.md",
    "meta-ads-consultant.md",
    "meta-ads-morning-review.md",
    "ad-copy-writer.md",
  ]);

  for (const file of fs.readdirSync(commandsRoot)) {
    if (file.endsWith(".md") && !allowed.has(file)) {
      removePath(path.join(commandsRoot, file));
    }
  }

  for (const file of allowed) {
    fs.copyFileSync(
      path.join(commandsSourceDir, file),
      path.join(commandsRoot, file)
    );
  }
}

function ensureGlobalBrandDna() {
  ensureDirectory(globalMetaRoot);
  createLocalFileIfMissing(
    path.join(templatesDir, "brand_dna.example.yaml"),
    globalBrandDnaPath
  );
}

function writeClaudeAdCopySubagent() {
  ensureDirectory(agentsRoot);
  const subagentPath = path.join(agentsRoot, "ad-copy-writer.md");
  const content = `---
name: ad-copy-writer
description: Meta ad copy subagent that returns builder-ready structured payloads.
model: sonnet
tools: Read, Grep, Glob, Bash
skills:
  - /Users/edvintoome/.agents/skills/ad-creative/SKILL.md
---

Read \`~/.meta-marketing-plugin/brand_dna.yaml\` before writing copy.
Inspect the provided \`target_url\` and use only facts verified on page.
Use the configured \`ad-creative\` skill.
Return builder-ready structured output:
- \`copy_context\`
- \`copy_variants\` with \`parents\`, \`teachers\`, \`general\`, each with \`headline\` and \`primary_text\`.
Do not invent claims or product facts.
`;
  fs.writeFileSync(subagentPath, content);
}

function installClaudeBundle() {
  ensureDirectory(claudeMetaRoot);
  ensureLink(skillsDir, path.join(claudeMetaRoot, "skills"));
  ensureLink(
    path.join(templatesDir, "site-profiles.example.json"),
    path.join(claudeMetaRoot, "site-profiles.example.json")
  );
  ensureLink(
    path.join(templatesDir, "SITE_PROFILES.md"),
    path.join(claudeMetaRoot, "SITE_PROFILES.md")
  );

  createLocalFileIfMissing(
    path.join(templatesDir, "site-profiles.example.json"),
    path.join(claudeMetaRoot, "site-profiles.local.json")
  );

  ensureGlobalBrandDna();
  writeClaudeAdCopySubagent();
  writeProjectReadme();
  installSlashCommands();
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
  upsertManagedBlock(
    claudePath,
    "<!-- meta-marketing-plugin:start -->",
    "<!-- meta-marketing-plugin:end -->",
    [
      "When you use Meta Ads workflows in this project, read `.claude/meta-marketing-plugin/README.md` first.",
      "Available slash commands:",
      "- `/meta-ads-builder`",
      "- `/meta-ads-consultant`",
      "- `/meta-ads-morning-review`",
      "- `/ad-copy-writer`",
    ]
  );
  writeGlobalClaudeConfig(metaAccessToken);
  ensureGitignoreEntries();

  console.log("Installed Meta Marketing Plugin support for Claude Code");
  console.log(`Project: ${projectRoot}`);
  console.log(`Claude bundle: ${claudeMetaRoot}`);
  console.log(`Commands: ${commandsRoot}`);
  console.log(`Subagent: ${path.join(agentsRoot, "ad-copy-writer.md")}`);
  console.log(`Global brand DNA: ${globalBrandDnaPath}`);
  console.log(`Claude MCP config: ${claudeConfigPath}`);
}

main().catch((error) => {
  console.error(`Failed to set up Claude integration: ${error.message}`);
  process.exit(1);
});
