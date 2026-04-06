#!/usr/bin/env node

import fs from "fs";
import path from "path";

const args = process.argv.slice(2);

function readArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

const targetRoot = path.resolve(readArg("--root") || process.cwd());
const siteProfilesPath = path.join(targetRoot, "site-profiles.local.json");
const brandDnaPath = path.join(targetRoot, "brand_dna.yaml");

const defaultProfiles = `${JSON.stringify({ profiles: [] }, null, 2)}\n`;
const defaultBrandDna = `brand:
  name: ""
  category: ""
voice: []
audiences: []
offers: []
claims:
  allowed: []
  forbidden: []
`;

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
  const createdBrandDna = writeIfMissing(brandDnaPath, defaultBrandDna);

  console.log(
    createdProfiles
      ? `✅ Created ${siteProfilesPath}`
      : `ℹ️  Kept existing ${siteProfilesPath}`
  );
  console.log(
    createdBrandDna
      ? `✅ Created ${brandDnaPath}`
      : `ℹ️  Kept existing ${brandDnaPath}`
  );
}

main();
