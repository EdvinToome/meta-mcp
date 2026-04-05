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

const targetRoot = path.resolve(readArg("--root") || process.cwd());

function main() {
  const createdProfiles = createLocalFileIfMissing(
    path.join(repoRoot, "templates", "site-profiles.example.json"),
    path.join(targetRoot, "site-profiles.local.json")
  );
  const createdBrandDna = createLocalFileIfMissing(
    path.join(repoRoot, "templates", "brand_dna.example.yaml"),
    path.join(targetRoot, "brand_dna.yaml")
  );

  if (createdProfiles) {
    console.log(`✅ Created ${path.join(targetRoot, "site-profiles.local.json")}`);
  } else {
    console.log(`ℹ️  Kept existing ${path.join(targetRoot, "site-profiles.local.json")}`);
  }

  if (createdBrandDna) {
    console.log(`✅ Created ${path.join(targetRoot, "brand_dna.yaml")}`);
  } else {
    console.log(`ℹ️  Kept existing ${path.join(targetRoot, "brand_dna.yaml")}`);
  }
}

main();
