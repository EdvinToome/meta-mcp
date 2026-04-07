#!/usr/bin/env node

import fs from "fs";
import path from "path";
import {
  ensureBrandDnaFiles,
  migrateLegacyBrandDnaIfPresent,
} from "./brand-dna.js";

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
  const brandDnaMigrationState = migrateLegacyBrandDnaIfPresent(targetRoot);
  const brandDnaFilesState = ensureBrandDnaFiles(targetRoot);

  console.log(
    createdProfiles
      ? `✅ Created ${siteProfilesPath}`
      : `ℹ️  Kept existing ${siteProfilesPath}`
  );
  console.log(
    brandDnaFilesState.copyCreated
      ? `✅ Created ${brandDnaFilesState.copyPath}`
      : `ℹ️  Kept existing ${brandDnaFilesState.copyPath}`
  );
  console.log(
    brandDnaFilesState.visualCreated
      ? `✅ Created ${brandDnaFilesState.visualPath}`
      : `ℹ️  Kept existing ${brandDnaFilesState.visualPath}`
  );
  if (brandDnaMigrationState.migratedCopyFromLegacy) {
    console.log("🔄 Migrated copy fields from brand_dna.yaml");
  }
  if (brandDnaMigrationState.migratedVisualFromLegacy) {
    console.log("🔄 Migrated non-copy fields from brand_dna.yaml");
  }
  if (brandDnaMigrationState.deletedLegacy) {
    console.log("🗑️ Deleted legacy brand_dna.yaml");
  }
}

main();
