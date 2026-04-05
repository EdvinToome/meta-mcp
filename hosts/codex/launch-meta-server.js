#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bundleRoot = path.resolve(__dirname, "..");
const repoBuild = path.resolve(__dirname, "../../../../build/index.js");
const bundleBuild = path.join(bundleRoot, "build", "index.js");
const entry = fs.existsSync(bundleBuild) ? bundleBuild : repoBuild;

if (!fs.existsSync(entry)) {
  throw new Error(`Missing Meta MCP build at ${entry}. Run npm run build.`);
}

const result = spawnSync(process.execPath, [entry, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
