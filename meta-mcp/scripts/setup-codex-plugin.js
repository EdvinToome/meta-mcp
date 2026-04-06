#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const pluginName = "meta-marketing-plugin";
const marketplaceName = "edvin-plugins";

const pluginTarget = path.join(os.homedir(), ".codex", "plugins", pluginName);
const pluginCacheRoot = path.join(
  os.homedir(),
  ".codex",
  "plugins",
  "cache",
  marketplaceName,
  pluginName
);
const pluginCachePath = path.join(pluginCacheRoot, "local");
const marketplacePath = path.join(
  os.homedir(),
  ".agents",
  "plugins",
  "marketplace.json"
);

const metaRoot = path.join(os.homedir(), ".meta-marketing-plugin");
const metaEnvPath = path.join(metaRoot, "meta.env");
const siteProfilesPath = path.join(metaRoot, "site-profiles.local.json");
const brandDnaPath = path.join(metaRoot, "brand_dna.yaml");

const codexAgentsRoot = path.join(os.homedir(), ".codex", "agents");
const codexAdCopyAgentPath = path.join(codexAgentsRoot, "ad-copy-writer.toml");

const codexSourcesDir = path.join(repoRoot, "agents", "codex");
const mcpCodexDir = path.join(repoRoot, "meta-mcp", "mcp", "codex");

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

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
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

function copyFile(source, target) {
  ensureDirectory(path.dirname(target));
  fs.copyFileSync(source, target);
}

function writeJson(targetPath, value) {
  ensureDirectory(path.dirname(targetPath));
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}

function createFileIfMissing(targetPath, content) {
  ensureDirectory(path.dirname(targetPath));
  if (fs.existsSync(targetPath)) {
    return false;
  }
  fs.writeFileSync(targetPath, content);
  return true;
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

function getPrompt(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
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

function loadMarketplace() {
  if (!fs.existsSync(marketplacePath)) {
    return {
      name: marketplaceName,
      interface: { displayName: "Edvin Plugins" },
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
      path: `./.codex/plugins/${pluginName}`,
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
  ensureDirectory(metaRoot);

  const existingMetaEnv = fs.existsSync(metaEnvPath)
    ? fs.readFileSync(metaEnvPath, "utf8")
    : "";

  const siteProfilesCreated = createFileIfMissing(
    siteProfilesPath,
    DEFAULT_SITE_PROFILES
  );
  const brandDnaCreated = createFileIfMissing(brandDnaPath, DEFAULT_BRAND_DNA);

  return { existingMetaEnv, siteProfilesCreated, brandDnaCreated };
}

function writeCodexAdCopySubagent() {
  ensureDirectory(codexAgentsRoot);
  copyFile(
    path.join(codexSourcesDir, "agents", "ad-copy-writer.toml"),
    codexAdCopyAgentPath
  );
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
  const buildPath = path.join(repoRoot, "meta-mcp", "build", "index.js");
  if (fs.existsSync(buildPath)) {
    return;
  }

  const installResult = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (installResult.error || installResult.status !== 0) {
    throw new Error("npm ci failed while preparing the Codex plugin bundle");
  }

  const buildResult = spawnSync("npm", ["run", "build"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (buildResult.error || buildResult.status !== 0) {
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
    { cwd: pluginTarget, stdio: "inherit" }
  );
  if (result.error || result.status !== 0) {
    throw new Error("npm install failed for the Codex plugin runtime");
  }
}

function stagePluginBundle() {
  removePath(pluginTarget);
  ensureDirectory(pluginTarget);

  replaceDirectory(
    path.join(codexSourcesDir, "skills"),
    path.join(pluginTarget, "agents", "codex", "skills")
  );
  replaceDirectory(
    path.join(codexSourcesDir, "agents"),
    path.join(pluginTarget, "agents", "codex", "agents")
  );
  copyFile(
    path.join(repoRoot, "templates", "SITE_PROFILES.md"),
    path.join(pluginTarget, "SITE_PROFILES.md")
  );
  replaceDirectory(
    path.join(mcpCodexDir),
    path.join(pluginTarget, "meta-mcp", "mcp", "codex")
  );
  copyFile(
    path.join(repoRoot, ".codex-plugin", "plugin.json"),
    path.join(pluginTarget, ".codex-plugin", "plugin.json")
  );
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
  stagePluginBundle();
  replaceDirectory(
    path.join(repoRoot, "meta-mcp", "build"),
    path.join(pluginTarget, "meta-mcp", "build")
  );
  writeJson(path.join(pluginTarget, "package.json"), runtimePackageJson());
  writeMarketplace();
  writeCodexAdCopySubagent();

  const created = ensureMetaConfig();
  const ttyAvailable = canOpenTty();
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

  if (!fs.existsSync(metaEnvPath) && !existingToken && !ttyAvailable) {
    throw new Error(
      "Missing Meta access token. Set META_ACCESS_TOKEN or run installer interactively."
    );
  }

  installRuntimeDependencies();
  replaceDirectory(pluginTarget, pluginCachePath);

  let wroteMetaEnv = false;
  if (!fs.existsSync(metaEnvPath)) {
    let accessToken = existingToken;
    let appId = existingAppId;
    let appSecret = existingAppSecret;
    let businessId = existingBusinessId;

    if (ttyAvailable) {
      const ttyInput = fs.createReadStream("/dev/tty");
      const ttyOutput = fs.createWriteStream("/dev/tty");
      const rl = readline.createInterface({ input: ttyInput, output: ttyOutput });

      if (!accessToken) {
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

    if (!accessToken) {
      throw new Error("META_ACCESS_TOKEN is required.");
    }

    writeMetaEnv({
      META_ACCESS_TOKEN: accessToken,
      META_APP_ID: appId,
      META_APP_SECRET: appSecret,
      META_BUSINESS_ID: businessId,
    });
    wroteMetaEnv = true;
  }

  console.log("Installed Meta Marketing Plugin for Codex");
  console.log(`Bundle: ${pluginTarget}`);
  console.log(`Cache: ${pluginCachePath}`);
  console.log(`Marketplace: ${marketplacePath}`);
  console.log(`Subagent: ${codexAdCopyAgentPath}`);
  console.log(`Profiles: ${siteProfilesPath}`);
  console.log(`Brand DNA: ${brandDnaPath}`);
  if (created.siteProfilesCreated) {
    console.log("Created global site-profiles.local.json");
  }
  if (created.brandDnaCreated) {
    console.log("Created global brand_dna.yaml");
  }
  if (wroteMetaEnv) {
    console.log("Created meta.env");
  }
}

main().catch((error) => {
  console.error(`Failed to set up Codex plugin: ${error.message}`);
  process.exit(1);
});
