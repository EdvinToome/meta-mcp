#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const pluginName = "meta-mcp";
const marketplaceName = "meta-mcp-local";
const pluginSource = repoRoot;
const pluginTarget = path.join(os.homedir(), "plugins", pluginName);
const marketplacePath = path.join(
  os.homedir(),
  ".agents",
  "plugins",
  "marketplace.json"
);
const configPath = path.join(
  process.env.CODEX_HOME || path.join(os.homedir(), ".codex"),
  "config.toml"
);

const args = process.argv.slice(2);
const force = args.includes("--force");

function ensureDirectory(dirPath) {
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

function ensurePluginLink() {
  ensureDirectory(path.dirname(pluginTarget));

  if (!fs.existsSync(pluginTarget)) {
    fs.symlinkSync(pluginSource, pluginTarget, "dir");
    return;
  }

  if (fs.lstatSync(pluginTarget).isSymbolicLink()) {
    const currentTarget = fs.realpathSync(pluginTarget);
    if (currentTarget === fs.realpathSync(pluginSource)) {
      return;
    }
  }

  if (!force) {
    throw new Error(
      `${pluginTarget} already exists. Re-run with --force to replace it.`
    );
  }

  removePath(pluginTarget);
  fs.symlinkSync(pluginSource, pluginTarget, "dir");
}

function writeMarketplace() {
  const payload = fs.existsSync(marketplacePath)
    ? JSON.parse(fs.readFileSync(marketplacePath, "utf8"))
    : {
        name: marketplaceName,
        interface: {
          displayName: "Meta MCP Local Plugins",
        },
        plugins: [],
      };

  payload.name ||= marketplaceName;
  payload.interface ||= {};
  payload.interface.displayName ||= "Meta MCP Local Plugins";
  payload.plugins ||= [];

  const entry = {
    name: pluginName,
    source: {
      source: "local",
      path: `./plugins/${pluginName}`,
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

  ensureDirectory(path.dirname(marketplacePath));
  fs.writeFileSync(marketplacePath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload.name;
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

function enablePlugin(activeMarketplaceName) {
  const pluginId = `${pluginName}@${activeMarketplaceName}`;
  const header = `[plugins."${pluginId}"]`;
  const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const output = `${removeTomlSection(existing, header)}\n\n${header}\nenabled = true\n`;
  ensureDirectory(path.dirname(configPath));
  fs.writeFileSync(configPath, output);
}

function main() {
  ensurePluginLink();
  const activeMarketplaceName = writeMarketplace();
  enablePlugin(activeMarketplaceName);

  console.log("✅ Installed Meta MCP as a local Codex plugin");
  console.log(`Plugin link: ${pluginTarget}`);
  console.log(`Marketplace: ${marketplacePath}`);
  console.log(`Codex config: ${configPath}`);
  console.log("Restart Codex to pick up the plugin entry.");
}

main();
