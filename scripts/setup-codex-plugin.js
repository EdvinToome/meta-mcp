#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const pluginName = "meta-ads-mcp";
const marketplaceName = "edvin-plugins";
const pluginSource = path.join(repoRoot, "codex", "plugins", pluginName);
const pluginTarget = path.join(os.homedir(), ".codex", "plugins", pluginName);
const marketplacePath = path.join(
  os.homedir(),
  ".agents",
  "plugins",
  "marketplace.json"
);
const metaConfigRoot = path.join(os.homedir(), ".meta-mcp");
const metaEnvPath = path.join(metaConfigRoot, "meta.env");

const args = process.argv.slice(2);
const force = args.includes("--force");

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getPrompt(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function removePath(targetPath) {
  const stat = fs.lstatSync(targetPath);
  if (stat.isSymbolicLink() || stat.isFile()) {
    fs.unlinkSync(targetPath);
    return;
  }
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function copyDirectory(source, target) {
  if (fs.existsSync(target)) {
    if (!force) {
      return;
    }

    removePath(target);
  }

  ensureDirectory(path.dirname(target));
  fs.cpSync(source, target, { recursive: true });
}

function writeJson(targetPath, value) {
  ensureDirectory(path.dirname(targetPath));
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}

function createFileIfMissing(targetPath, content) {
  ensureDirectory(path.dirname(targetPath));
  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, content);
    return true;
  }
  return false;
}

function readEnvValue(source, key) {
  const prefix = `${key}=`;
  for (const line of source.split("\n")) {
    if (!line.startsWith(prefix)) {
      continue;
    }
    return line.slice(prefix.length).trim().replace(/^"|"$/g, "");
  }
  return "";
}

function loadMarketplace() {
  if (!fs.existsSync(marketplacePath)) {
    return {
      name: marketplaceName,
      interface: {
        displayName: "Edvin Plugins",
      },
      plugins: [],
    };
  }

  return JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
}

function writeMarketplace() {
  const payload = loadMarketplace();
  payload.name = marketplaceName;
  payload.interface ||= {};
  payload.interface.displayName = "Edvin Plugins";
  payload.plugins ||= [];

  const entry = {
    name: pluginName,
    source: {
      source: "local",
      path: "./.codex/plugins/meta-ads-mcp",
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    },
    category: "Productivity",
  };

  const existingIndex = payload.plugins.findIndex(
    (plugin) => plugin?.name === pluginName
  );

  if (existingIndex === -1) {
    payload.plugins.push(entry);
  } else {
    payload.plugins[existingIndex] = entry;
  }

  writeJson(marketplacePath, payload);
}

function ensureMetaConfig() {
  ensureDirectory(metaConfigRoot);

  const existingMetaEnv = fs.existsSync(metaEnvPath)
    ? fs.readFileSync(metaEnvPath, "utf8")
    : "";
  const siteProfilesCreated = createFileIfMissing(
    path.join(metaConfigRoot, "site-profiles.local.json"),
    fs.readFileSync(path.join(pluginSource, "site-profiles.example.json"), "utf8")
  );

  const businessRulesCreated = createFileIfMissing(
    path.join(metaConfigRoot, "BUSINESS_RULES.local.md"),
    fs.readFileSync(path.join(pluginSource, "BUSINESS_RULES.example.md"), "utf8")
  );

  createFileIfMissing(
    path.join(metaConfigRoot, "README.md"),
    [
      "# Meta MCP Local Config",
      "",
      "This directory stores the local Meta Ads configuration used by Codex.",
      "",
      "Files:",
      "- `site-profiles.local.json`",
      "- `BUSINESS_RULES.local.md`",
      "",
      "The plugin bundle lives in `~/.codex/plugins/meta-ads-mcp`.",
      "The global Meta access token is installed by the Meta MCP installer and is not stored here.",
      "",
    ].join("\n")
  );

  return {
    existingMetaEnv,
    siteProfilesCreated,
    businessRulesCreated,
  };
}

function writeMetaEnv(envValues) {
  const lines = [`META_ACCESS_TOKEN=${JSON.stringify(envValues.META_ACCESS_TOKEN)}`];

  if (envValues.META_APP_ID) {
    lines.push(`META_APP_ID=${JSON.stringify(envValues.META_APP_ID)}`);
  }
  if (envValues.META_APP_SECRET) {
    lines.push(`META_APP_SECRET=${JSON.stringify(envValues.META_APP_SECRET)}`);
    lines.push('META_AUTO_REFRESH="true"');
  }
  if (envValues.META_BUSINESS_ID) {
    lines.push(`META_BUSINESS_ID=${JSON.stringify(envValues.META_BUSINESS_ID)}`);
  }

  fs.writeFileSync(metaEnvPath, `${lines.join("\n")}\n`);
}

async function main() {
  copyDirectory(pluginSource, pluginTarget);
  writeMarketplace();
  const created = ensureMetaConfig();

  const existingToken =
    process.env.META_ACCESS_TOKEN ||
    readEnvValue(created.existingMetaEnv, "META_ACCESS_TOKEN");
  const existingAppId =
    process.env.META_APP_ID || readEnvValue(created.existingMetaEnv, "META_APP_ID");
  const existingAppSecret =
    process.env.META_APP_SECRET ||
    readEnvValue(created.existingMetaEnv, "META_APP_SECRET");
  const existingBusinessId =
    process.env.META_BUSINESS_ID ||
    readEnvValue(created.existingMetaEnv, "META_BUSINESS_ID");

  let wroteMetaEnv = false;
  let skippedMetaEnv = false;

  if (!fs.existsSync(metaEnvPath)) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let accessToken = existingToken;
    if (!accessToken) {
      accessToken = "";
      while (!accessToken) {
        accessToken = (await getPrompt(rl, "Meta Access Token: ")).trim();
      }
    }

    let appId = existingAppId;
    let appSecret = existingAppSecret;
    let businessId = existingBusinessId;

    if (!appId) {
      appId = (await getPrompt(rl, "Meta App ID (optional): ")).trim();
    }
    if (!appSecret) {
      appSecret = (await getPrompt(rl, "Meta App Secret (optional): ")).trim();
    }
    if (!businessId) {
      businessId = (await getPrompt(rl, "Meta Business ID (optional): ")).trim();
    }

    rl.close();

    writeMetaEnv({
      META_ACCESS_TOKEN: accessToken,
      META_APP_ID: appId,
      META_APP_SECRET: appSecret,
      META_BUSINESS_ID: businessId,
    });
    wroteMetaEnv = true;
  } else {
    skippedMetaEnv = true;
  }

  if (
    skippedMetaEnv &&
    !existingToken &&
    !process.env.META_ACCESS_TOKEN
  ) {
    console.log(`⚠️  ${metaEnvPath} exists but META_ACCESS_TOKEN is missing.`);
  }

  console.log("✅ Installed Meta Ads MCP Codex plugin");
  console.log(`Plugin source: ${pluginSource}`);
  console.log(`Plugin target: ${pluginTarget}`);
  console.log(`Marketplace: ${marketplacePath}`);
  console.log(`Meta config: ${metaConfigRoot}`);
  if (wroteMetaEnv) {
    console.log(`✅ Created ${metaEnvPath}`);
  } else if (skippedMetaEnv) {
    console.log(`ℹ️  Kept existing ${metaEnvPath}`);
  }
  if (created.siteProfilesCreated) {
    console.log(
      `✅ Created ${path.join(metaConfigRoot, "site-profiles.local.json")}`
    );
  }
  if (created.businessRulesCreated) {
    console.log(
      `✅ Created ${path.join(metaConfigRoot, "BUSINESS_RULES.local.md")}`
    );
  }
  console.log("Restart Codex to pick up the plugin entry.");
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
