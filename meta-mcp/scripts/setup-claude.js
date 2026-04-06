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

function normalizeMetaAccessToken(rawToken) {
  let token = rawToken.trim().replace(/\r/g, "");
  const tokenPrefix = /^META_ACCESS_TOKEN\s*=\s*/;
  while (tokenPrefix.test(token)) {
    token = token.replace(tokenPrefix, "").trim();
  }
  token = token.replace(/^['"]|['"]$/g, "");
  return token;
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
const claudeRoot = path.join(projectRoot, ".claude");
const skillsRoot = path.join(claudeRoot, "skills");
const agentsRoot = path.join(claudeMetaRoot, "agents");
const claudePath = path.join(projectRoot, "CLAUDE.md");
const claudeConfigPath = getClaudeConfigPath();
const projectMetaEnvPath = path.join(claudeMetaRoot, "meta.env");
const PRESERVED_PROJECT_META_FILES = new Set([
  "meta.env",
  "site-profiles.local.json",
  "brand_dna.yaml",
]);

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }
  const stat = fs.lstatSync(targetPath);
  if (stat.isSymbolicLink() || stat.isFile()) {
    fs.unlinkSync(targetPath);
    return;
  }
  fs.rmSync(targetPath, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}

function clearDirectoryContentsPreservingFiles(dirPath, preservedFiles) {
  ensureDirectory(dirPath);
  for (const entry of fs.readdirSync(dirPath)) {
    if (preservedFiles.has(entry)) {
      continue;
    }
    removePath(path.join(dirPath, entry));
  }
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
  const existingEnv = { ...(existingServer.env || {}) };
  delete existingEnv.META_ACCESS_TOKEN;

  payload.mcpServers ||= {};
  payload.mcpServers["meta-marketing-plugin"] = {
    command: "node",
    args: [path.join(claudeMetaRoot, "scripts", "launch-meta-server.js")],
    ...(Object.keys(existingEnv).length > 0 ? { env: existingEnv } : {}),
  };
  if (payload.mcpServers.meta) {
    delete payload.mcpServers.meta;
  }

  ensureDirectory(path.dirname(claudeConfigPath));
  fs.writeFileSync(claudeConfigPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function readEnvValue(source, key) {
  const prefix = `${key}=`;
  for (const line of source.split("\n")) {
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim().replace(/^"|"$/g, "");
    }
  }
  return "";
}

function writeProjectMetaEnv(metaAccessToken) {
  if (!metaAccessToken) {
    return;
  }
  ensureDirectory(path.dirname(projectMetaEnvPath));
  const source = fs.existsSync(projectMetaEnvPath)
    ? fs.readFileSync(projectMetaEnvPath, "utf8")
    : "";
  const lines = source
    .split("\n")
    .filter((line) => line && !line.startsWith("META_ACCESS_TOKEN="));
  lines.unshift(`META_ACCESS_TOKEN=${metaAccessToken}`);
  fs.writeFileSync(projectMetaEnvPath, `${lines.join("\n")}\n`);
}

function ensureGitignoreEntries() {
  const gitignorePath = path.join(projectRoot, ".claude", ".gitignore");
  const entries = [
    "meta-marketing-plugin/site-profiles.local.json",
    "meta-marketing-plugin/.mcp.json",
    "meta-marketing-plugin/meta.env",
    "meta-marketing-plugin/package.json",
    "meta-marketing-plugin/build/",
    "meta-marketing-plugin/node_modules/",
    "meta-marketing-plugin/agents/ad-copy-writer.md",
  ];
  const deprecatedEntries = [
    "commands/meta-ads-builder.md",
    "commands/meta-ads-morning-review.md",
    "agents/ad-copy-writer.md",
  ];

  ensureDirectory(path.dirname(gitignorePath));
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, "");
  }

  const existing = fs
    .readFileSync(gitignorePath, "utf8")
    .split("\n")
    .filter((line) => !deprecatedEntries.includes(line));
  const missing = entries.filter((entry) => !existing.includes(entry));
  if (missing.length === 0 && existing.length > 0) {
    fs.writeFileSync(gitignorePath, `${existing.join("\n").trimEnd()}\n`);
    return;
  }
  const next = `${existing.join("\n").trimEnd()}\n${missing.join("\n")}\n`;
  fs.writeFileSync(gitignorePath, next.replace(/^\n/, ""));
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
  ensureDirectory(claudeRoot);
  clearDirectoryContentsPreservingFiles(
    claudeMetaRoot,
    PRESERVED_PROJECT_META_FILES
  );
  copyDirectory(
    path.join(claudeSourcesDir, "skills"),
    skillsRoot,
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
  fs.writeFileSync(
    path.join(claudeMetaRoot, "package.json"),
    `${JSON.stringify(runtimePackageJson(), null, 2)}\n`
  );
  installRuntimeDependencies();

  ensureProjectSiteProfiles();
  ensureGlobalBrandDna();

  removePath(path.join(claudeRoot, "commands"));
  removePath(path.join(claudeMetaRoot, "commands"));
  removePath(path.join(claudeMetaRoot, "skills"));
  removePath(path.join(claudeRoot, "agents"));

  copyDirectory(path.join(claudeSourcesDir, "agents"), agentsRoot, true);
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

function runtimePackageJson() {
  const rootPackage = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")
  );

  return {
    name: "meta-marketing-plugin-runtime",
    private: true,
    type: rootPackage.type,
    version: rootPackage.version,
    description: rootPackage.description,
    engines: rootPackage.engines,
    dependencies: rootPackage.dependencies,
  };
}

function installRuntimeDependencies() {
  const targetNodeModules = path.join(claudeMetaRoot, "node_modules");
  const sourceNodeModules = path.join(repoRoot, "node_modules");

  if (fs.existsSync(sourceNodeModules)) {
    copyDirectory(sourceNodeModules, targetNodeModules, true);
    return;
  }

  const result = spawnSync(
    "npm",
    ["install", "--omit=dev", "--no-audit", "--no-fund"],
    { cwd: claudeMetaRoot, stdio: "inherit" }
  );
  if (result.error || result.status !== 0) {
    throw new Error("npm install failed for Claude runtime dependencies");
  }
}

function getPrompt(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  const existingProjectMetaEnv = fs.existsSync(projectMetaEnvPath)
    ? fs.readFileSync(projectMetaEnvPath, "utf8")
    : "";
  const existingProjectToken = readEnvValue(
    existingProjectMetaEnv,
    "META_ACCESS_TOKEN",
  );

  let metaAccessToken =
    process.env.META_ACCESS_TOKEN || readArg("--meta-token") || existingProjectToken;

  if (!metaAccessToken && process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    metaAccessToken = (await getPrompt(rl, "Meta Access Token (optional): ")).trim();
    rl.close();
  }

  metaAccessToken = normalizeMetaAccessToken(metaAccessToken || "");

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
      "- `.claude/meta-marketing-plugin/brand_dna.yaml`",
      "- `.claude/meta-marketing-plugin/agents/ad-copy-writer.md`",
      "- `.claude/skills/meta-ads-builder/SKILL.md`",
    ]
  );
  writeGlobalClaudeConfig(metaAccessToken);
  writeProjectMetaEnv(metaAccessToken);
  ensureGitignoreEntries();

  console.log("Installed Meta Marketing Plugin support for Claude Code");
  console.log(`Project: ${projectRoot}`);
  console.log(`Claude bundle: ${claudeMetaRoot}`);
  console.log(`Skills: ${skillsRoot}`);
  console.log(`Subagent: ${path.join(agentsRoot, "ad-copy-writer.md")}`);
  console.log(`Claude MCP config: ${claudeConfigPath}`);
}

main().catch((error) => {
  console.error(`Failed to set up Claude integration: ${error.message}`);
  process.exit(1);
});
