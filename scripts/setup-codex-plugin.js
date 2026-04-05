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
const metaConfigRoot = path.join(os.homedir(), ".meta-marketing-plugin");
const metaEnvPath = path.join(metaConfigRoot, "meta.env");
const codexAgentsRoot = path.join(os.homedir(), ".codex", "agents");
const codexAdCopyAgentPath = path.join(codexAgentsRoot, "ad-copy-writer.toml");

const templatesDir = path.join(repoRoot, "templates");
const agentDir = path.join(repoRoot, "agent");
const hostsCodexDir = path.join(repoRoot, "hosts", "codex");

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
  ensureDirectory(metaConfigRoot);

  const existingMetaEnv = fs.existsSync(metaEnvPath)
    ? fs.readFileSync(metaEnvPath, "utf8")
    : "";

  const siteProfilesCreated = createFileIfMissing(
    path.join(metaConfigRoot, "site-profiles.local.json"),
    fs.readFileSync(path.join(templatesDir, "site-profiles.example.json"), "utf8")
  );

  const brandDnaCreated = createFileIfMissing(
    path.join(metaConfigRoot, "brand_dna.yaml"),
    fs.readFileSync(path.join(templatesDir, "brand_dna.example.yaml"), "utf8")
  );

  createFileIfMissing(
    path.join(metaConfigRoot, "README.md"),
    [
      "# Meta Marketing Plugin Local Config",
      "",
      "This directory stores local Meta configuration for Codex and Claude.",
      "",
      "Files:",
      "- `site-profiles.local.json`",
      "- `brand_dna.yaml`",
      "- `meta.env`",
      "",
      "Do not commit these files to source control.",
      "",
    ].join("\n")
  );

  return { existingMetaEnv, siteProfilesCreated, brandDnaCreated };
}

function writeCodexAdCopySubagent() {
  ensureDirectory(codexAgentsRoot);
  const content = [
    'name = "ad_copy_writer"',
    'description = "Subagent for Meta ad copy payload generation from brand DNA and target URL."',
    'model = "gpt-5.4-mini"',
    'model_reasoning_effort = "medium"',
    'developer_instructions = """',
    "Read ~/.meta-marketing-plugin/brand_dna.yaml before writing copy.",
    "Inspect the provided target_url and extract only verified page facts.",
    "Use the installed ad-creative skill for copy drafting patterns.",
    "Return builder-ready structured output with copy_context and copy_variants.",
    "copy_variants must include parents, teachers, and general; each must include headline and primary_text.",
    "Do not invent claims. If a fact cannot be verified on the page, exclude it.",
    '"""',
    "",
    "[[skills.config]]",
    'path = "/Users/edvintoome/.agents/skills/ad-creative/SKILL.md"',
    "enabled = true",
    "",
  ].join("\n");

  fs.writeFileSync(codexAdCopyAgentPath, content);
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

  const installResult = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
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
    { cwd: pluginTarget, stdio: "inherit" }
  );
  if (result.error) {
    throw new Error("Missing npm. Install Node.js with npm and try again.");
  }
  if (result.status !== 0) {
    throw new Error("npm install failed for the Codex plugin runtime");
  }
}

function stagePluginBundle() {
  removePath(pluginTarget);
  ensureDirectory(pluginTarget);

  replaceDirectory(path.join(agentDir, "skills"), path.join(pluginTarget, "skills"));
  replaceDirectory(path.join(agentDir, "commands"), path.join(pluginTarget, "commands"));

  copyFile(
    path.join(templatesDir, "SITE_PROFILES.md"),
    path.join(pluginTarget, "SITE_PROFILES.md")
  );
  copyFile(
    path.join(templatesDir, "site-profiles.example.json"),
    path.join(pluginTarget, "site-profiles.example.json")
  );
  copyFile(
    path.join(templatesDir, "brand_dna.example.yaml"),
    path.join(pluginTarget, "brand_dna.example.yaml")
  );

  copyFile(path.join(hostsCodexDir, "mcp.json"), path.join(pluginTarget, ".mcp.json"));
  copyFile(
    path.join(hostsCodexDir, "plugin.json"),
    path.join(pluginTarget, ".codex-plugin", "plugin.json")
  );
  copyFile(
    path.join(hostsCodexDir, "launch-meta-server.js"),
    path.join(pluginTarget, "scripts", "launch-meta-server.js")
  );

  fs.writeFileSync(
    path.join(pluginTarget, "README.md"),
    [
      "# Meta Marketing Plugin (Codex)",
      "",
      "Generated from canonical sources in this repository.",
      "Do not edit the installed bundle directly.",
      "",
    ].join("\n")
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
  replaceDirectory(path.join(repoRoot, "build"), path.join(pluginTarget, "build"));
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
      throw new Error(
        "META_ACCESS_TOKEN is required. Set it in the environment or run interactively."
      );
    }

    writeMetaEnv({
      META_ACCESS_TOKEN: accessToken,
      META_APP_ID: appId,
      META_APP_SECRET: appSecret,
      META_BUSINESS_ID: businessId,
    });
    wroteMetaEnv = true;
  } else if (created.existingMetaEnv.trim().length === 0) {
    skippedMetaEnv = true;
  }

  console.log("Installed Meta Marketing Plugin for Codex");
  console.log(`Bundle: ${pluginTarget}`);
  console.log(`Cache: ${pluginCachePath}`);
  console.log(`Marketplace: ${marketplacePath}`);
  console.log(`Local config: ${metaConfigRoot}`);
  console.log(`Subagent: ${codexAdCopyAgentPath}`);

  if (created.siteProfilesCreated) {
    console.log("Created site-profiles.local.json from template");
  }
  if (created.brandDnaCreated) {
    console.log("Created brand_dna.yaml from template");
  }
  if (wroteMetaEnv) {
    console.log("Created meta.env with provided credentials");
  } else if (skippedMetaEnv) {
    console.log("meta.env exists but is empty; update it before using live Meta tools");
  }

  console.log("Restart Codex and install/enable `meta-marketing-plugin` if needed.");
}

main().catch((error) => {
  console.error(`Failed to set up Codex plugin: ${error.message}`);
  process.exit(1);
});
