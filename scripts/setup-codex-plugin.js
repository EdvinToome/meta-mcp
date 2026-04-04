#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { spawnSync } from "child_process";
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
const pluginCacheRoot = path.join(
  os.homedir(),
  ".codex",
  "plugins",
  "cache",
  marketplaceName,
  pluginName
);
const pluginCachePath = path.join(pluginCacheRoot, "local");
const metaConfigRoot = path.join(os.homedir(), ".meta-mcp");
const metaEnvPath = path.join(metaConfigRoot, "meta.env");

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getPrompt(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function canOpenTty() {
  try {
    const fd = fs.openSync("/dev/tty", "r");
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

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

function replaceDirectory(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing source directory: ${source}`);
  }

  removePath(target);
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

function runtimePackageJson() {
  const rootPackage = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")
  );

  return {
    name: pluginName,
    private: true,
    type: rootPackage.type,
    version: rootPackage.version,
    description: rootPackage.description,
    engines: rootPackage.engines,
    dependencies: rootPackage.dependencies,
  };
}

function ensureRepoBuild() {
  const buildPath = path.join(repoRoot, "build", "index.js");
  if (fs.existsSync(buildPath)) {
    return;
  }

  const installResult = spawnSync(
    "npm",
    ["ci", "--no-audit", "--no-fund"],
    {
      cwd: repoRoot,
      stdio: "inherit",
    }
  );

  if (installResult.error) {
    throw new Error("Missing npm. Install Node.js with npm and try again.");
  }
  if (installResult.status !== 0) {
    throw new Error("npm ci failed while preparing the Codex plugin bundle");
  }

  const buildResult = spawnSync("npm", ["run", "build"], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (buildResult.error) {
    throw new Error("Missing npm. Install Node.js with npm and try again.");
  }
  if (buildResult.status !== 0) {
    throw new Error("npm run build failed while preparing the Codex plugin bundle");
  }
}

function installRuntimeDependencies() {
  const sourceNodeModules = path.join(repoRoot, "node_modules");
  if (fs.existsSync(sourceNodeModules)) {
    replaceDirectory(sourceNodeModules, path.join(pluginTarget, "node_modules"));
    return;
  }

  const result = spawnSync(
    "npm",
    ["install", "--omit=dev", "--no-audit", "--no-fund"],
    {
      cwd: pluginTarget,
      stdio: "inherit",
    }
  );

  if (result.error) {
    throw new Error("Missing npm. Install Node.js with npm and try again.");
  }
  if (result.status !== 0) {
    throw new Error("npm install failed for the Codex plugin runtime");
  }
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
  removePath(pluginCacheRoot);
  ensureRepoBuild();
  replaceDirectory(pluginSource, pluginTarget);
  replaceDirectory(path.join(repoRoot, "build"), path.join(pluginTarget, "build"));
  writeJson(path.join(pluginTarget, "package.json"), runtimePackageJson());
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
  const ttyAvailable = canOpenTty();

  if (!fs.existsSync(metaEnvPath) && !existingToken && !ttyAvailable) {
    throw new Error(
      "Missing Meta access token. Set META_ACCESS_TOKEN or run the installer from an interactive terminal."
    );
  }

  installRuntimeDependencies();
  replaceDirectory(pluginTarget, pluginCachePath);

  let wroteMetaEnv = false;
  let skippedMetaEnv = false;

  if (!fs.existsSync(metaEnvPath)) {
    let accessToken = existingToken;
    let appId = existingAppId;
    let appSecret = existingAppSecret;
    let businessId = existingBusinessId;

    if (ttyAvailable) {
      const ttyInput = fs.createReadStream("/dev/tty");
      const ttyOutput = fs.createWriteStream("/dev/tty");
      const rl = readline.createInterface({
        input: ttyInput,
        output: ttyOutput,
      });

      if (!accessToken) {
        accessToken = "";
        while (!accessToken) {
          accessToken = (await getPrompt(rl, "Meta Access Token: ")).trim();
        }
      }

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
      ttyInput.close();
      ttyOutput.close();
    }

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
  console.log(`Plugin cache: ${pluginCachePath}`);
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
