#!/usr/bin/env node

import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const [command, ...rest] = process.argv.slice(2);

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

async function main() {
  if (!command || command === "serve") {
    await import(pathToFileURL(path.join(repoRoot, "build", "index.js")).href);
    return;
  }

  if (command === "install-claude") {
    runNodeScript(path.join(repoRoot, "scripts", "setup-claude.js"), rest);
    return;
  }

  if (command === "install-codex-plugin") {
    runNodeScript(path.join(repoRoot, "scripts", "setup-codex-plugin.js"), rest);
    return;
  }

  if (command === "init-workspace") {
    runNodeScript(path.join(repoRoot, "scripts", "init-workspace-config.js"), rest);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error("Available commands: serve, install-claude, install-codex-plugin, init-workspace");
  process.exit(1);
}

main();
