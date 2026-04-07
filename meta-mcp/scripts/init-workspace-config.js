#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { ensureSplitBrandDnaFiles } from "./brand-dna.js";

const args = process.argv.slice(2);

function readArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

const targetRoot = path.resolve(readArg("--root") || process.cwd());
const siteProfilesPath = path.join(targetRoot, "site-profiles.local.json");

const defaultProfiles = `${JSON.stringify({ profiles: [] }, null, 2)}\n`;
function writeIfMissing(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    return false;
  }
  fs.writeFileSync(filePath, content);
  return true;
}

function main() {
  const createdProfiles = writeIfMissing(siteProfilesPath, defaultProfiles);
  const brandDnaState = ensureSplitBrandDnaFiles(targetRoot);

  console.log(
    createdProfiles
      ? `✅ Created ${siteProfilesPath}`
      : `ℹ️  Kept existing ${siteProfilesPath}`
  );
  console.log(
    brandDnaState.copyCreated
      ? `✅ Created ${brandDnaState.copyPath}`
      : `ℹ️  Kept existing ${brandDnaState.copyPath}`
  );
  console.log(
    brandDnaState.visualCreated
      ? `✅ Created ${brandDnaState.visualPath}`
      : `ℹ️  Kept existing ${brandDnaState.visualPath}`
  );
  if (brandDnaState.migratedCopyFromLegacy) {
    console.log("🔄 Migrated copy fields from brand_dna.yaml");
  }
  if (brandDnaState.migratedVisualFromLegacy) {
    console.log("🔄 Migrated non-copy fields from brand_dna.yaml");
  }
}

main();
