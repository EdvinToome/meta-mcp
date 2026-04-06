#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { ensureDirectory } from "./workspace-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const args = process.argv.slice(2);

const claudeSourcesDir = path.join(repoRoot, "agents", "claude");
const mcpClaudeDir = path.join(repoRoot, "meta-mcp", "mcp", "claude");

const DEFAULT_SITE_PROFILES = `${JSON.stringify({ profiles: [] }, null, 2)}\n`;
const DEFAULT_BRAND_DNA = `brand:
  name: ""
  category: ""
voice: []
audiences: []
offers: []
claims:
  allowed: []
  forbidden: []
`;

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
const commandsRoot = path.join(claudeMetaRoot, "commands");
const agentsRoot = path.join(claudeMetaRoot,  "agents");
const claudePath = path.join(projectRoot, "CLAUDE.md");
const claudeConfigPath = getClaudeConfigPath();

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

function copyFile(source, target, overwrite = true) {
  ensureDirectory(path.dirname(target));
  if (!overwrite && fs.existsSync(target)) {
    return;
  }
  fs.copyFileSync(source, target);
}

function copyDirectory(source, target, overwrite = true) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing source directory: ${source}`);
  }
  if (overwrite && fs.existsSync(target)) {
    removePath(target);
  }
  if (!overwrite && fs.existsSync(target)) {
    return;
  }
  ensureDirectory(path.dirname(target));
  fs.cpSync(source, target, { recursive: true });
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
  const existingServer = payload.mcpServers?.["meta-marketing-plugin"] || {};
  const existingEnv = existingServer.env || {};

  payload.mcpServers ||= {};
  payload.mcpServers["meta-marketing-plugin"] = {
    command: "node",
    args: [path.join(claudeMetaRoot, "scripts", "launch-meta-server.js")],
    env: {
      ...existingEnv,
      META_ACCESS_TOKEN: metaAccessToken,
    },
  };
  if (payload.mcpServers.meta) {
    delete payload.mcpServers.meta;
  }

  ensureDirectory(path.dirname(claudeConfigPath));
  fs.writeFileSync(claudeConfigPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function ensureGitignoreEntries() {
  const gitignorePath = path.join(projectRoot, ".claude", ".gitignore");
  const entries = [
    "meta-marketing-plugin/site-profiles.local.json",
    "meta-marketing-plugin/.mcp.json",
    "meta-marketing-plugin/build/",
    "agents/ad-copy-writer.md",
    "commands/meta-ads-builder.md",
    "commands/meta-ads-morning-review.md",
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

function installSlashCommands() {
  ensureDirectory(commandsRoot);
  const files = ["meta-ads-builder.md", "meta-ads-morning-review.md"];

  for (const file of fs.readdirSync(commandsRoot)) {
    if (file.endsWith(".md") && !files.includes(file)) {
      removePath(path.join(commandsRoot, file));
    }
  }

  for (const file of files) {
    fs.copyFileSync(
      path.join(claudeSourcesDir, "commands", file),
      path.join(commandsRoot, file)
    );
  }
}

function ensureProjectSiteProfiles() {
  const siteProfilesPath = path.join(claudeMetaRoot, "site-profiles.local.json");
  ensureDirectory(path.dirname(siteProfilesPath));
  if (!fs.existsSync(siteProfilesPath)) {
    fs.writeFileSync(siteProfilesPath, DEFAULT_SITE_PROFILES);
  }
}

function ensureGlobalBrandDna() {
  const dnaPath = path.join(claudeMetaRoot, "brand_dna.yaml");
  ensureDirectory(path.dirname(dnaPath));
  if (!fs.existsSync(dnaPath)) {
    fs.writeFileSync(dnaPath, DEFAULT_BRAND_DNA);
  }
}

function installClaudeAssets() {
  ensureDirectory(claudeMetaRoot);
  copyDirectory(
    path.join(claudeSourcesDir, "skills"),
    path.join(claudeMetaRoot, "skills"),
    true
  );
  copyFile(
    path.join(repoRoot, "templates", "SITE_PROFILES.md"),
    path.join(claudeMetaRoot, "SITE_PROFILES.md"),
    true
  );
  copyFile(
    path.join(mcpClaudeDir, "mcp.json"),
    path.join(claudeMetaRoot, ".mcp.json"),
    true
  );
  copyFile(
    path.join(mcpClaudeDir, "launch-meta-server.js"),
    path.join(claudeMetaRoot, "scripts", "launch-meta-server.js"),
    true
  );
  copyDirectory(
    path.join(repoRoot, "meta-mcp", "build"),
    path.join(claudeMetaRoot, "build"),
    true
  );

  ensureProjectSiteProfiles();
  ensureGlobalBrandDna();

  ensureDirectory(agentsRoot);
  copyFile(
    path.join(claudeSourcesDir, "agents", "ad-copy-writer.md"),
    path.join(agentsRoot, "ad-copy-writer.md"),
    true
  );

  installSlashCommands();
}

function ensureRepoBuild() {
  const buildPath = path.join(repoRoot, "meta-mcp", "build", "index.js");
  if (fs.existsSync(buildPath)) {
    return;
  }

  const installResult = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (installResult.error || installResult.status !== 0) {
    throw new Error("npm ci failed while preparing Claude build");
  }

  const buildResult = spawnSync("npm", ["run", "build"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (buildResult.error || buildResult.status !== 0) {
    throw new Error("npm run build failed while preparing Claude build");
  }
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

  ensureRepoBuild();
  installClaudeAssets();
  upsertManagedBlock(
    claudePath,
    "<!-- meta-marketing-plugin:start -->",
    "<!-- meta-marketing-plugin:end -->",
    [
      "Meta plugin project files:",
      "- `.claude/meta-marketing-plugin/site-profiles.local.json`",
      "- `.claude/meta-marketing-plugin/.mcp.json`",
      "- `.claude/agents/ad-copy-writer.md`",
      "Available slash commands:",
      "- `/meta-ads-builder`",
      "- `/meta-ads-morning-review`",
    ]
  );
  writeGlobalClaudeConfig(metaAccessToken);
  ensureGitignoreEntries();

  console.log("Installed Meta Marketing Plugin support for Claude Code");
  console.log(`Project: ${projectRoot}`);
  console.log(`Claude bundle: ${claudeMetaRoot}`);
  console.log(`Commands: ${commandsRoot}`);
  console.log(`Subagent: ${path.join(agentsRoot, "ad-copy-writer.md")}`);
  console.log(`Claude MCP config: ${claudeConfigPath}`);
}

main().catch((error) => {
  console.error(`Failed to set up Claude integration: ${error.message}`);
  process.exit(1);
});
