#!/usr/bin/env node

import path from "path";
import readline from "readline";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const setupClaudePath = path.join(__dirname, "setup-claude.js");
const args = process.argv.slice(2);

function readArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

function hasArg(name) {
  return args.includes(name);
}

function promptToken() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("Meta Access Token: ", (value) => {
      rl.close();
      resolve(value.trim());
    });
  });
}

async function main() {
  const setupArgs = [...args];

  if (!readArg("--project")) {
    setupArgs.push("--project", process.cwd());
  }

  if (!readArg("--meta-token")) {
    const token = process.env.META_ACCESS_TOKEN || (await promptToken());
    if (!token) {
      throw new Error("META_ACCESS_TOKEN is required");
    }
    setupArgs.push("--meta-token", token);
  }

  if (!hasArg("--force") && process.env.META_MCP_FORCE === "1") {
    setupArgs.push("--force");
  }

  const result = spawnSync(process.execPath, [setupClaudePath, ...setupArgs], {
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error(`Failed to set up Meta MCP: ${error.message}`);
  process.exit(1);
});
