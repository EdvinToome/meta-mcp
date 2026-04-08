#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const entryCandidates = [
  path.join(path.resolve(__dirname, ".."), "build", "gemini-index.js"),
  path.join(path.resolve(__dirname, "..", ".."), "build", "gemini-index.js"),
];
const entry = entryCandidates.find((candidate) => fs.existsSync(candidate));
const pluginRoot = path.resolve(path.dirname(entry || entryCandidates[0]), "..");
const localMetaEnvPath = path.join(pluginRoot, "meta.env");

if (!entry) {
  throw new Error(
    `Missing build at ${entryCandidates.join(" or ")}. Run npm run build.`
  );
}

const localEnv = {};
if (fs.existsSync(localMetaEnvPath)) {
  const source = fs.readFileSync(localMetaEnvPath, "utf8");
  for (const line of source.split("\n")) {
    if (!line || line.startsWith("#")) {
      continue;
    }
    const idx = line.indexOf("=");
    if (idx < 1) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (key) {
      localEnv[key] = value;
    }
  }
}

const result = spawnSync(process.execPath, [entry, ...process.argv.slice(2)], {
  env: {
    ...process.env,
    ...localEnv,
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
