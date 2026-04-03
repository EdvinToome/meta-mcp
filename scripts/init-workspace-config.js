#!/usr/bin/env node

import path from "path";
import { fileURLToPath } from "url";
import { createLocalFileIfMissing } from "./workspace-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);

function readArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

const targetRoot = path.resolve(readArg("--root") || repoRoot);

function main() {
  const createdProfiles = createLocalFileIfMissing(
    path.join(repoRoot, "site-profiles.example.json"),
    path.join(targetRoot, "site-profiles.local.json")
  );
  const createdRules = createLocalFileIfMissing(
    path.join(repoRoot, "BUSINESS_RULES.example.md"),
    path.join(targetRoot, "BUSINESS_RULES.local.md")
  );

  if (createdProfiles) {
    console.log(`✅ Created ${path.join(targetRoot, "site-profiles.local.json")}`);
  } else {
    console.log(`ℹ️  Kept existing ${path.join(targetRoot, "site-profiles.local.json")}`);
  }

  if (createdRules) {
    console.log(`✅ Created ${path.join(targetRoot, "BUSINESS_RULES.local.md")}`);
  } else {
    console.log(`ℹ️  Kept existing ${path.join(targetRoot, "BUSINESS_RULES.local.md")}`);
  }
}

main();
