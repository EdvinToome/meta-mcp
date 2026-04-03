import fs from "fs";
import path from "path";

export function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function createLocalFileIfMissing(examplePath, localPath) {
  ensureDirectory(path.dirname(localPath));
  if (fs.existsSync(localPath)) {
    return false;
  }
  fs.copyFileSync(examplePath, localPath);
  return true;
}
