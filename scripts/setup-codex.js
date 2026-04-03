#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const skillsSourceDir = path.join(repoRoot, "skills");
const configPath = path.join(
  process.env.CODEX_HOME || path.join(os.homedir(), ".codex"),
  "config.toml"
);
const skillsDir = path.join(path.dirname(configPath), "skills");
const tsxBinary = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx"
);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const copyMode = args.includes("--copy");
const force = args.includes("--force");

function readArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

function getServerName() {
  return readArg("--server-name") || "meta";
}

function tomlString(value) {
  return JSON.stringify(value);
}

function removeTomlSection(source, header) {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line === header);
  if (start === -1) {
    return source.trimEnd();
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("[") && line.endsWith("]")) {
      end = index;
      break;
    }
  }

  return [...lines.slice(0, start), ...lines.slice(end)]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

function findSection(source, header) {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line === header);
  if (start === -1) {
    return "";
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("[") && line.endsWith("]")) {
      end = index;
      break;
    }
  }

  return lines.slice(start + 1, end).join("\n");
}

function readTomlValue(source, header, key) {
  const section = findSection(source, header);
  const prefix = `${key} = "`;
  for (const line of section.split("\n")) {
    if (!line.startsWith(prefix) || !line.endsWith('"')) {
      continue;
    }
    return line.slice(prefix.length, -1);
  }
  return "";
}

function buildServerBlock(serverName, envValues) {
  const envLines = [`META_ACCESS_TOKEN = ${tomlString(envValues.META_ACCESS_TOKEN)}`];

  if (envValues.META_APP_ID) {
    envLines.push(`META_APP_ID = ${tomlString(envValues.META_APP_ID)}`);
  }
  if (envValues.META_APP_SECRET) {
    envLines.push(
      `META_APP_SECRET = ${tomlString(envValues.META_APP_SECRET)}`
    );
    envLines.push('META_AUTO_REFRESH = "true"');
  }
  if (envValues.META_BUSINESS_ID) {
    envLines.push(
      `META_BUSINESS_ID = ${tomlString(envValues.META_BUSINESS_ID)}`
    );
  }

  return [
    `[mcp_servers.${serverName}]`,
    `command = ${tomlString(tsxBinary)}`,
    `args = [${tomlString(path.join(repoRoot, "src", "index.ts"))}]`,
    "enabled = true",
    "",
    `[mcp_servers.${serverName}.env]`,
    ...envLines,
  ].join("\n");
}

function getPrompt(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function ensureDependenciesInstalled() {
  if (fs.existsSync(tsxBinary)) {
    return;
  }

  console.log("📦 Installing project dependencies...");
  if (dryRun) {
    console.log(`   Would run: npm install (cwd: ${repoRoot})`);
    return;
  }
  execSync("npm install", { cwd: repoRoot, stdio: "inherit" });
}

function ensureDirectory(dirPath) {
  if (dryRun) {
    console.log(`   Would ensure directory exists: ${dirPath}`);
    return;
  }
  fs.mkdirSync(dirPath, { recursive: true });
}

function removePath(targetPath) {
  const stat = fs.lstatSync(targetPath);
  if (stat.isSymbolicLink() || stat.isFile()) {
    fs.unlinkSync(targetPath);
    return;
  }
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function listSkillNames() {
  if (!fs.existsSync(skillsSourceDir)) {
    return [];
  }

  return fs
    .readdirSync(skillsSourceDir, { withFileTypes: true })
    .filter((entry) => {
      if (!entry.isDirectory()) {
        return false;
      }
      return fs.existsSync(path.join(skillsSourceDir, entry.name, "SKILL.md"));
    })
    .map((entry) => entry.name)
    .sort();
}

function installSkill(name) {
  const skillSource = path.join(skillsSourceDir, name);
  const skillTarget = path.join(skillsDir, name);
  const desiredTarget = fs.realpathSync(skillSource);

  if (!fs.existsSync(skillTarget)) {
    if (dryRun) {
      console.log(
        `   Would ${copyMode ? "copy" : "symlink"} skill ${name} to ${skillTarget}`
      );
      return;
    }

    if (copyMode) {
      fs.cpSync(skillSource, skillTarget, { recursive: true });
    } else {
      fs.symlinkSync(
        skillSource,
        skillTarget,
        process.platform === "win32" ? "junction" : "dir"
      );
    }
    console.log(
      `✅ Installed Codex skill ${name} at ${skillTarget} (${copyMode ? "copy" : "symlink"})`
    );
    return;
  }

  const currentTarget =
    fs.lstatSync(skillTarget).isSymbolicLink() && !copyMode
      ? fs.realpathSync(skillTarget)
      : "";

  if (currentTarget === desiredTarget) {
    console.log(`✅ Codex skill ${name} already installed at ${skillTarget}`);
    return;
  }

  if (!force) {
    console.log(
      `⚠️  Skill path already exists at ${skillTarget}. Leaving it unchanged. Re-run with --force to replace it with the repo version.`
    );
    return;
  }

  if (dryRun) {
    console.log(`   Would replace existing skill at ${skillTarget}`);
    return;
  }

  removePath(skillTarget);
  if (copyMode) {
    fs.cpSync(skillSource, skillTarget, { recursive: true });
  } else {
    fs.symlinkSync(
      skillSource,
      skillTarget,
      process.platform === "win32" ? "junction" : "dir"
    );
  }
  console.log(
    `✅ Replaced Codex skill ${name} at ${skillTarget} (${copyMode ? "copy" : "symlink"})`
  );
}

function installSkills() {
  const skillNames = listSkillNames();
  ensureDirectory(skillsDir);

  if (skillNames.length === 0) {
    console.log("⚠️  No repo skills found to install.");
    return;
  }

  for (const skillName of skillNames) {
    installSkill(skillName);
  }
}

function writeCodexConfig(serverName, envValues) {
  const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const withoutEnv = removeTomlSection(
    existing,
    `[mcp_servers.${serverName}.env]`
  );
  const withoutServer = removeTomlSection(
    withoutEnv,
    `[mcp_servers.${serverName}]`
  );
  const block = buildServerBlock(serverName, envValues);
  const output = `${withoutServer.trimEnd()}\n\n${block}\n`;

  if (dryRun) {
    console.log(`   Would write Codex MCP config to ${configPath}`);
    console.log(block);
    return;
  }

  ensureDirectory(path.dirname(configPath));
  fs.writeFileSync(configPath, output);
  console.log(`✅ Updated Codex config: ${configPath}`);
}

async function main() {
  const serverName = getServerName();
  const existingConfig = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, "utf8")
    : "";

  const existingToken =
    process.env.META_ACCESS_TOKEN ||
    readTomlValue(existingConfig, `[mcp_servers.${serverName}.env]`, "META_ACCESS_TOKEN");
  const existingAppId =
    process.env.META_APP_ID ||
    readTomlValue(existingConfig, `[mcp_servers.${serverName}.env]`, "META_APP_ID");
  const existingAppSecret =
    process.env.META_APP_SECRET ||
    readTomlValue(
      existingConfig,
      `[mcp_servers.${serverName}.env]`,
      "META_APP_SECRET"
    );
  const existingBusinessId =
    process.env.META_BUSINESS_ID ||
    readTomlValue(
      existingConfig,
      `[mcp_servers.${serverName}.env]`,
      "META_BUSINESS_ID"
    );

  console.log("🚀 Codex Meta MCP + Skill Setup\n");
  console.log(`Repo: ${repoRoot}`);
  console.log(`Codex config: ${configPath}`);
  console.log(`Codex skills source: ${skillsSourceDir}`);
  console.log(`MCP server name: ${serverName}`);
  if (dryRun) {
    console.log("Mode: dry-run");
  }

  ensureDependenciesInstalled();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let accessToken = existingToken;
  if (!accessToken) {
    if (dryRun) {
      accessToken = "your_meta_access_token_here";
      console.log("✅ Using placeholder META_ACCESS_TOKEN for dry-run");
    } else {
      accessToken = (await getPrompt(rl, "Meta Access Token: ")).trim();
    }
  } else {
    console.log("✅ Reusing META_ACCESS_TOKEN from existing config or environment");
  }

  if (!accessToken) {
    rl.close();
    throw new Error("META_ACCESS_TOKEN is required");
  }

  let appId = existingAppId;
  let appSecret = existingAppSecret;
  let businessId = existingBusinessId;

  if (!existingAppId && !dryRun) {
    appId = (await getPrompt(rl, "Meta App ID (optional): ")).trim();
  }
  if (!existingAppSecret && !dryRun) {
    appSecret = (await getPrompt(rl, "Meta App Secret (optional): ")).trim();
  }
  if (!existingBusinessId && !dryRun) {
    businessId = (await getPrompt(rl, "Meta Business ID (optional): ")).trim();
  }

  rl.close();

  installSkills();
  writeCodexConfig(serverName, {
    META_ACCESS_TOKEN: accessToken,
    META_APP_ID: appId,
    META_APP_SECRET: appSecret,
    META_BUSINESS_ID: businessId,
  });

  console.log("\nNext steps:");
  console.log("1. Restart Codex");
  console.log("2. Use $meta-ads-builder, $meta-ads-consultant, or $meta-ads-morning-review in this repo");
  console.log("3. Initialize local config with: npm run init:workspace");
  console.log(
    '4. Start with: "Use $meta-ads-builder to publish a paused Meta ad from /absolute/path/to/image.jpg for the selected site profile"'
  );
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
