import { defineConfig } from "tsup";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  clean: true,
  dts: false,
  entry: [
    path.join(__dirname, "src", "index.ts"),
    path.join(__dirname, "src", "gemini-index.ts"),
  ],
  format: ["esm"],
  outDir: path.join(__dirname, "build"),
  platform: "node",
  sourcemap: true,
  splitting: false,
  target: "node18",
});
