#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const entryCandidates = [
  path.join(path.resolve(__dirname, ".."), "build", "index.js"),
  path.join(path.resolve(__dirname, "..", ".."), "build", "index.js"),
];
const entry = entryCandidates.find((candidate) => fs.existsSync(candidate));

if (!entry) {
  throw new Error(
    `Missing build at ${entryCandidates.join(" or ")}. Run npm run build.`
  );
}

const result = spawnSync(process.execPath, [entry, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
