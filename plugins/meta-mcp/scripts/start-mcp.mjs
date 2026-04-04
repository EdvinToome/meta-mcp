#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const ENV_FILE = path.join(".claude", "meta-mcp", "mcp-env.local.json");

function findProjectEnvFile(startDir) {
  let currentDir = startDir;

  while (true) {
    const candidate = path.join(currentDir, ENV_FILE);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return "";
    }

    currentDir = parentDir;
  }
}

function readEnvFile(filePath) {
  if (!filePath) {
    throw new Error(
      `Missing ${ENV_FILE}. Run /meta-mcp-init in your project first.`
    );
  }

  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const env = payload.env || {};

  if (!env.META_ACCESS_TOKEN) {
    throw new Error(
      `Missing META_ACCESS_TOKEN in ${filePath}. Fill that file and try again.`
    );
  }

  return env;
}

function main() {
  const envFile = findProjectEnvFile(process.cwd());
  const fileEnv = readEnvFile(envFile);
  const child = spawn(
    "npx",
    ["-y", "@edvintoome/meta-mcp"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        ...fileEnv,
      },
    }
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

main();
