import fs from "fs";

export function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}
